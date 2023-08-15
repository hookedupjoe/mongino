/**!
 * audioMotion-analyzer-data-only
 * Audio spectrum analyzer JS module for FFT reading only
 *
 * @version 4.1.0
 * @author  Henrique Avila Vianna <hvianna@gmail.com> <https://henriquevianna.com>
 * updated by to remove visuals: Joseph Francis <hookedupjoe@gmail.com>
 * @license AGPL-3.0-or-later
 */

const VERSION = '4.1.0';

// internal constants
const TAU     = 2 * Math.PI,
	  HALF_PI = Math.PI / 2,
	  RPM     = TAU / 3600,  // angle increment per frame for one revolution per minute @60fps
	  C_1     = 8.17579892;  // frequency for C -1

const CHANNEL_COMBINED         = 'dual-combined',
	  CHANNEL_SINGLE           = 'single',
	  CHANNEL_VERTICAL         = 'dual-vertical',
	  COLOR_BAR_INDEX          = 'bar-index',
	  COLOR_BAR_LEVEL          = 'bar-level',
	  COLOR_GRADIENT           = 'gradient',
 	  FILTER_NONE              = '',
 	  FILTER_A                 = 'A',
 	  FILTER_B                 = 'B',
 	  FILTER_C                 = 'C',
 	  FILTER_D                 = 'D',
 	  FILTER_468               = '468',
	  SCALE_BARK               = 'bark',
	  SCALE_LINEAR             = 'linear',
	  SCALE_LOG                = 'log',
	  SCALE_MEL                = 'mel';

// built-in gradients
const PRISM = [ '#a35', '#c66', '#e94', '#ed0', '#9d5', '#4d8', '#2cb', '#0bc', '#09c', '#36b' ];
	  

// custom error messages
const ERR_AUDIO_CONTEXT_FAIL     = [ 'ERR_AUDIO_CONTEXT_FAIL', 'Could not create audio context. Web Audio API not supported?' ],
	  ERR_INVALID_AUDIO_CONTEXT  = [ 'ERR_INVALID_AUDIO_CONTEXT', 'Provided audio context is not valid' ],
	  ERR_FREQUENCY_TOO_LOW      = [ 'ERR_FREQUENCY_TOO_LOW', 'Frequency values must be >= 1' ],
	  ERR_INVALID_MODE           = [ 'ERR_INVALID_MODE', 'Invalid mode' ],
	  ERR_REFLEX_OUT_OF_RANGE    = [ 'ERR_REFLEX_OUT_OF_RANGE', 'Reflex ratio must be >= 0 and < 1' ],
	  ERR_INVALID_AUDIO_SOURCE   = [ 'ERR_INVALID_AUDIO_SOURCE', 'Audio source must be an instance of HTMLMediaElement or AudioNode' ];

class AudioMotionError extends Error {
	constructor( error, value ) {
		const [ code, message ] = error;
		super( message + ( value !== undefined ? `: ${value}` : '' ) );
		this.name = 'AudioMotionError';
		this.code = code;
	}
}

// helper function - output deprecation warning message on console
const deprecate = ( name, alternative ) => console.warn( `${name} is deprecated. Use ${alternative} instead.` );

// helper function - validate a given value with an array of strings (by default, all lowercase)
// returns the validated value, or the first element of `list` if `value` is not found in the array
const validateFromList = ( value, list, modifier = 'toLowerCase' ) => list[ Math.max( 0, list.indexOf( ( '' + value )[ modifier ]() ) ) ];

// AudioMotionAnalyzer class

export default class AudioMotionAnalyzer {

/**
 * CONSTRUCTOR
 *
 * @param {object} [container] DOM element where to insert the analyzer; if undefined, uses the document body
 * @param {object} [options]
 * @returns {object} AudioMotionAnalyzer object
 */
	constructor( container, options = {} ) {

		this._ready = false;

		// Initialize internal objects
		this._aux = {};
		this._flg = {};
		this._gradients = {};       // registered gradients
		this._selectedGrads = [];   // names of the currently selected gradients for channels 0 and 1


		// Set container
		this._container = container || document.body;

		// Make sure we have minimal width and height dimensions in case of an inline container
		this._defaultWidth  = this._container.clientWidth  || 640;
		this._defaultHeight = this._container.clientHeight || 270;

		// Use audio context provided by user, or create a new one

		let audioCtx;

		if ( options.source && ( audioCtx = options.source.context ) ) {
			// get audioContext from provided source audioNode
		}
		else if ( audioCtx = options.audioCtx ) {
			// use audioContext provided by user
		}
		else {
			try {
				audioCtx = new ( window.AudioContext || window.webkitAudioContext )();
			}
			catch( err ) {
				throw new AudioMotionError( ERR_AUDIO_CONTEXT_FAIL );
			}
		}

		// make sure audioContext is valid
		if ( ! audioCtx.createGain )
			throw new AudioMotionError( ERR_INVALID_AUDIO_CONTEXT );

		/*
			Connection routing:
			===================

			for dual channel modes:                  +--->  analyzer[0]  ---+
		    	                                     |                      |
			(source) --->  input  --->  splitter  ---+                      +--->  merger  --->  output  ---> (destination)
		    	                                     |                      |
		        	                                 +--->  analyzer[1]  ---+

			for single channel mode:

			(source) --->  input  ----------------------->  analyzer[0]  --------------------->  output  ---> (destination)

		*/

		// create the analyzer nodes, channel splitter and merger, and gain nodes for input/output connections
		const analyzer = this._analyzer = [ audioCtx.createAnalyser(), audioCtx.createAnalyser() ];
		const splitter = this._splitter = audioCtx.createChannelSplitter(2);
 		const merger   = this._merger   = audioCtx.createChannelMerger(2);
 		this._input    = audioCtx.createGain();
 		this._output   = audioCtx.createGain();

 		// initialize sources array and connect audio source if provided in the options
		this._sources = [];
		if ( options.source )
			this.connectInput( options.source );

 		// connect splitter -> analyzers
 		for ( const i of [0,1] )
			splitter.connect( analyzer[ i ], i );

		// connect merger -> output
		merger.connect( this._output );

		// connect output -> destination (speakers)
		this._outNodes = [];
		if ( options.connectSpeakers !== false )
			this.connectOutput();

		// initialize object to save energy
		this._energy = { val: 0, peak: 0, hold: 0 };

		// create analyzer canvas
		const canvas = document.createElement('canvas');
		canvas.style = 'max-width: 100%;';
		this._canvasCtx = canvas.getContext('2d');

		// create auxiliary canvases for the X-axis and radial scale labels
		for ( const ctx of [ '_scaleX', '_scaleR' ] )
			this[ ctx ] = document.createElement('canvas').getContext('2d');

		// set fullscreen element (defaults to canvas)
		this._fsEl = options.fsElement || canvas;

		

		// if browser supports ResizeObserver, listen for resize on the container


		// Resume audio context if in suspended state (browsers' autoplay policy)
		const unlockContext = () => {
			if ( audioCtx.state == 'suspended' )
				audioCtx.resume();
			window.removeEventListener( 'click', unlockContext );
		}
		window.addEventListener( 'click', unlockContext );

		// Set configuration options and use defaults for any missing properties
		this._setProps( options, true );

		// add canvas to the container
		if ( this.useCanvas )
			this._container.appendChild( canvas );

		// Finish canvas setup
		this._ready = true;
		
	}

	/**
	 * ==========================================================================
	 *
	 * PUBLIC PROPERTIES GETTERS AND SETTERS
	 *
	 * ==========================================================================
	 */

	get alphaBars() {
		return this._alphaBars;
	}
	set alphaBars( value ) {
		this._alphaBars = !! value;
		this._calcBars();
	}

	get ansiBands() {
		return this._ansiBands;
	}
	set ansiBands( value ) {
		this._ansiBands = !! value;
		this._calcBars();
	}

	get barSpace() {
		return this._barSpace;
	}
	set barSpace( value ) {
		this._barSpace = +value || 0;
		this._calcBars();
	}

	get channelLayout() {
		return this._chLayout;
	}
	set channelLayout( value ) {
		this._chLayout = validateFromList( value, [ CHANNEL_SINGLE, CHANNEL_VERTICAL, CHANNEL_COMBINED ] );

		// update node connections
		this._input.disconnect();
		this._input.connect( this._chLayout != CHANNEL_SINGLE ? this._splitter : this._analyzer[0] );
		this._analyzer[0].disconnect();
		if ( this._outNodes.length ) // connect analyzer only if the output is connected to other nodes
			this._analyzer[0].connect( this._chLayout != CHANNEL_SINGLE ? this._merger : this._output );

		this._calcBars();

	}

	get colorMode() {
		return this._colorMode;
	}
	set colorMode( value ) {
		this._colorMode = validateFromList( value, [ COLOR_GRADIENT, COLOR_BAR_INDEX, COLOR_BAR_LEVEL ] );
	}

	get fftSize() {
		return this._analyzer[0].fftSize;
	}
	set fftSize( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].fftSize = value;
		const binCount = this._analyzer[0].frequencyBinCount;
		this._fftData = [ new Float32Array( binCount ), new Float32Array( binCount ) ];
		this._calcBars();
	}

	get frequencyScale() {
		return this._frequencyScale;
	}
	set frequencyScale( value ) {
		this._frequencyScale = validateFromList( value, [ SCALE_LOG, SCALE_BARK, SCALE_MEL, SCALE_LINEAR ] );
		this._calcBars();
	}



	get height() {
		return this._height;
	}
	set height( h ) {
		this._height = h;

	}

	get ledBars() {
		return this._showLeds;
	}
	set ledBars( value ) {
		this._showLeds = !! value;
		this._calcBars();
	}

	get linearAmplitude() {
		return this._linearAmplitude;
	}
	set linearAmplitude( value ) {
		this._linearAmplitude = !! value;
	}

	get linearBoost() {
		return this._linearBoost;
	}
	set linearBoost( value ) {
		this._linearBoost = value >= 1 ? +value : 1;
	}

	get lineWidth() {
		return this._lineWidth;
	}
	set lineWidth( value ) {
		this._lineWidth = +value || 0;
	}

	get loRes() {
		return this._loRes;
	}
	set loRes( value ) {
		this._loRes = !! value;
		
	}

	get lumiBars() {
		return this._lumiBars;
	}
	set lumiBars( value ) {
		this._lumiBars = !! value;
		this._calcBars();
		
	}

	get maxDecibels() {
		return this._analyzer[0].maxDecibels;
	}
	set maxDecibels( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].maxDecibels = value;
	}

	get maxFreq() {
		return this._maxFreq;
	}
	set maxFreq( value ) {
		if ( value < 1 )
			throw new AudioMotionError( ERR_FREQUENCY_TOO_LOW );
		else {
			this._maxFreq = Math.min( value, this.audioCtx.sampleRate / 2 );
			this._calcBars();
		}
	}

	get minDecibels() {
		return this._analyzer[0].minDecibels;
	}
	set minDecibels( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].minDecibels = value;
	}

	get minFreq() {
		return this._minFreq;
	}
	set minFreq( value ) {
		if ( value < 1 )
			throw new AudioMotionError( ERR_FREQUENCY_TOO_LOW );
		else {
			this._minFreq = +value;
			this._calcBars();
		}
	}

	get mirror() {
		return this._mirror;
	}
	set mirror( value ) {
		this._mirror = Math.sign( value ) | 0; // ensure only -1, 0 or 1
		this._calcBars();
		
	}

	get mode() {
		return this._mode;
	}
	set mode( value ) {
		const mode = value | 0;
		if ( mode >= 0 && mode <= 10 && mode != 9 ) {
			this._mode = mode;
			this._calcBars();
			
		}
		else
			throw new AudioMotionError( ERR_INVALID_MODE, value );
	}


	get outlineBars() {
		return this._outlineBars;
	}
	set outlineBars( value ) {
		this._outlineBars = !! value;
		this._calcBars();
	}

	get radial() {
		return this._radial;
	}
	set radial( value ) {
		this._radial = !! value;
		this._calcBars();
		
	}

	get reflexRatio() {
		return this._reflexRatio;
	}
	set reflexRatio( value ) {
		value = +value || 0;
		if ( value < 0 || value >= 1 )
			throw new AudioMotionError( ERR_REFLEX_OUT_OF_RANGE );
		else {
			this._reflexRatio = value;
			this._calcBars();
			
		}
	}

	get roundBars() {
		return this._roundBars;
	}
	set roundBars( value ) {
		this._roundBars = !! value;
		this._calcBars();
	}

	get smoothing() {
		return this._analyzer[0].smoothingTimeConstant;
	}
	set smoothing( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].smoothingTimeConstant = value;
	}

	get spinSpeed() {
		return this._spinSpeed;
	}
	set spinSpeed( value ) {
		value = +value || 0;
		if ( this._spinSpeed === undefined || value == 0 )
			this._spinAngle = -HALF_PI; // initialize or reset the rotation angle
		this._spinSpeed = value;
	}

	get splitGradient() {
		return this._splitGradient;
	}
	set splitGradient( value ) {
		this._splitGradient = !! value;
		
	}

	get stereo() {
		deprecate( 'stereo', 'channelLayout' );
		return this._chLayout != CHANNEL_SINGLE;
	}
	set stereo( value ) {
		deprecate( 'stereo', 'channelLayout' );
		this.channelLayout = value ? CHANNEL_VERTICAL : CHANNEL_SINGLE;
	}

	get trueLeds() {
		return this._trueLeds;
	}
	set trueLeds( value ) {
		this._trueLeds = !! value;
	}

	get volume() {
		return this._output.gain.value;
	}
	set volume( value ) {
		this._output.gain.value = value;
	}

	get weightingFilter() {
		return this._weightingFilter;
	}
	set weightingFilter( value ) {
		this._weightingFilter = validateFromList( value, [ FILTER_NONE, FILTER_A, FILTER_B, FILTER_C, FILTER_D, FILTER_468 ], 'toUpperCase' );
	}

	get width() {
		return this._width;
	}
	set width( w ) {
		this._width = w;
		
	}

	// Read only properties

	get audioCtx() {
		return this._input.context;
	}
	get canvas() {
		return this._canvasCtx.canvas;
	}
	get canvasCtx() {
		return this._canvasCtx;
	}
	get connectedSources() {
		return this._sources;
	}
	get connectedTo() {
		return this._outNodes;
	}
	get fps() {
		return this._fps;
	}
	get fsHeight() {
		return this._fsHeight;
	}
	get fsWidth() {
		return this._fsWidth;
	}
	get isAlphaBars() {
		return this._flg.isAlpha;
	}
	get isBandsMode() {
		return this._flg.isBands;
	}
	get isFullscreen() {
		return ( document.fullscreenElement || document.webkitFullscreenElement ) === this._fsEl;
	}
	get isLedBars() {
		return this._flg.isLeds;
	}
	get isLumiBars() {
		return this._flg.isLumi;
	}
	get isOctaveBands() {
		return this._flg.isOctaves;
	}
	get isOn() {
		return this._runId !== undefined;
	}
	get isOutlineBars() {
		return this._flg.isOutline;
	}
	get pixelRatio() {
		return this._pixelRatio;
	}
	get isRoundBars() {
		return this._flg.isRound;
	}
	static get version() {
		return VERSION;
	}

	/**
	 * ==========================================================================
     *
	 * PUBLIC METHODS
	 *
	 * ==========================================================================
	 */

	/**
	 * Connects an HTML media element or audio node to the analyzer
	 *
	 * @param {object} an instance of HTMLMediaElement or AudioNode
	 * @returns {object} a MediaElementAudioSourceNode object if created from HTML element, or the same input object otherwise
	 */
	connectInput( source ) {
		const isHTML = source instanceof HTMLMediaElement;

		if ( ! ( isHTML || source.connect ) )
			throw new AudioMotionError( ERR_INVALID_AUDIO_SOURCE );

		// if source is an HTML element, create an audio node for it; otherwise, use the provided audio node
		const node = isHTML ? this.audioCtx.createMediaElementSource( source ) : source;

		if ( ! this._sources.includes( node ) ) {
			node.connect( this._input );
			this._sources.push( node );
		}

		return node;
	}

	/**
	 * Connects the analyzer output to another audio node
	 *
	 * @param [{object}] an AudioNode; if undefined, the output is connected to the audio context destination (speakers)
	 */
	connectOutput( node = this.audioCtx.destination ) {
		if ( this._outNodes.includes( node ) )
			return;

		this._output.connect( node );
		this._outNodes.push( node );

		// when connecting the first node, also connect the analyzer nodes to the merger / output nodes
		if ( this._outNodes.length == 1 ) {
			for ( const i of [0,1] )
				this._analyzer[ i ].connect( ( this._chLayout == CHANNEL_SINGLE && ! i ? this._output : this._merger ), 0, i );
		}
	}

	/**
	 * Disconnects audio sources from the analyzer
	 *
	 * @param [{object|array}] a connected AudioNode object or an array of such objects; if undefined, all connected nodes are disconnected
	 * @param {boolean} [stopTracks] if true, stops the track when disconnected
	 */
	disconnectInput( sources, stopTracks ) {
		if ( ! sources )
			sources = Array.from( this._sources );
		else if ( ! Array.isArray( sources ) )
			sources = [ sources ];

		for ( const node of sources ) {
			const idx = this._sources.indexOf( node );			
			if (stopTracks && node.mediaStream){
				for ( const ats of node.mediaStream.getAudioTracks() ){
					ats.stop();
				}
			}
			if ( idx >= 0 ) {
				node.disconnect( this._input );
				this._sources.splice( idx, 1 );
			}
		}
	}

	/**
	 * Disconnects the analyzer output from other audio nodes
	 *
	 * @param [{object}] a connected AudioNode object; if undefined, all connected nodes are disconnected
	 */
	disconnectOutput( node ) {
		if ( node && ! this._outNodes.includes( node ) )
			return;

		this._output.disconnect( node );
		this._outNodes = node ? this._outNodes.filter( e => e !== node ) : [];

		// if disconnected from all nodes, also disconnect the analyzer nodes so they keep working on Chromium
		// see https://github.com/hvianna/audioMotion-analyzer/issues/13#issuecomment-808764848
		if ( this._outNodes.length == 0 ) {
			for ( const i of [0,1] )
				this._analyzer[ i ].disconnect();
		}
	}

	/**
	 * Returns analyzer bars data
     *
	 * @returns {array}
	 */
	getBars() {
		return Array.from( this._bars, ( { posX, freq, freqLo, freqHi, hold, peak, value } ) => ( { posX, freq, freqLo, freqHi, hold, peak, value } ) );
	}

	/**
	 * Returns the energy of a frequency, or average energy of a range of frequencies
	 *
	 * @param [{number|string}] single or initial frequency (Hz), or preset name; if undefined, returns the overall energy
	 * @param [{number}] ending frequency (Hz)
	 * @returns {number|null} energy value (0 to 1) or null, if the specified preset is unknown
	 */
	getEnergy( startFreq, endFreq ) {
		if ( startFreq === undefined )
			return this._energy.val;

		// if startFreq is a string, check for presets
		if ( startFreq != +startFreq ) {
			if ( startFreq == 'peak' )
				return this._energy.peak;

			const presets = {
				bass:    [ 20, 250 ],
				lowMid:  [ 250, 500 ],
				mid:     [ 500, 2e3 ],
				highMid: [ 2e3, 4e3 ],
				treble:  [ 4e3, 16e3 ]
			}

			if ( ! presets[ startFreq ] )
				return null;

			[ startFreq, endFreq ] = presets[ startFreq ];
		}

		const startBin = this._freqToBin( startFreq ),
		      endBin   = endFreq ? this._freqToBin( endFreq ) : startBin,
		      chnCount = this._chLayout == CHANNEL_SINGLE ? 1 : 2;

		let energy = 0;
		for ( let channel = 0; channel < chnCount; channel++ ) {
			for ( let i = startBin; i <= endBin; i++ )
				energy += this._normalizedB( this._fftData[ channel ][ i ] );
		}

		return energy / ( endBin - startBin + 1 ) / chnCount;
	}




	/**
	 * Set desired frequency range
	 *
	 * @param {number} min lowest frequency represented in the x-axis
	 * @param {number} max highest frequency represented in the x-axis
	 */
	setFreqRange( min, max ) {
		if ( min < 1 || max < 1 )
			throw new AudioMotionError( ERR_FREQUENCY_TOO_LOW );
		else {
			this._minFreq = Math.min( min, max );
			this.maxFreq  = Math.max( min, max ); // use the setter for maxFreq
		}
	}

	/**
	 * Set custom parameters for LED effect
	 * If called with no arguments or if any property is invalid, clears any previous custom parameters
	 *
	 * @param {object} [params]
	 */
	setLedParams( params ) {
		let maxLeds, spaceV, spaceH;

		// coerce parameters to Number; `NaN` results are rejected in the condition below
		if ( params ) {
			maxLeds = params.maxLeds | 0, // ensure integer
			spaceV  = +params.spaceV,
			spaceH  = +params.spaceH;
		}

		this._ledParams = maxLeds > 0 && spaceV > 0 && spaceH >= 0 ? [ maxLeds, spaceV, spaceH ] : undefined;
		this._calcBars();
	}

	/**
	 * Shorthand function for setting several options at once
	 *
	 * @param {object} options
	 */
	setOptions( options ) {
		this._setProps( options );
	}

	/**
	 * Adjust the analyzer's sensitivity
	 *
	 * @param {number} min minimum decibels value
	 * @param {number} max maximum decibels value
	 */
	setSensitivity( min, max ) {
		for ( const i of [0,1] ) {
			this._analyzer[ i ].minDecibels = Math.min( min, max );
			this._analyzer[ i ].maxDecibels = Math.max( min, max );
		}
	}

	/**
	 * Start / stop canvas animation
	 *
	 * @param {boolean} [value] if undefined, inverts the current status
	 * @returns {boolean} resulting status after the change
	 */
	toggleAnalyzer( value ) {
		const started = this.isOn;

		if ( value === undefined )
			value = ! started;

		if ( started && ! value ) {
			clearTimeout( this._runId );
			this._runId = undefined;
		}
		else if ( ! started && value ) {
			this._frame = this._fps = 0;
			this._time = performance.now();
			this._runId = setTimeout( this._draw.bind(this), 100 );
		}

		return this.isOn;
	}

	/**
	 * Toggles canvas full-screen mode
	 */
	toggleFullscreen() {
		if ( this.isFullscreen ) {
			if ( document.exitFullscreen )
				document.exitFullscreen();
			else if ( document.webkitExitFullscreen )
				document.webkitExitFullscreen();
		}
		else {
			const fsEl = this._fsEl;
			if ( fsEl.requestFullscreen )
				fsEl.requestFullscreen();
			else if ( fsEl.webkitRequestFullscreen )
				fsEl.webkitRequestFullscreen();
		}
	}

	/**
	 * ==========================================================================
	 *
	 * PRIVATE METHODS
	 *
	 * ==========================================================================
	 */

	/**
	 * Return the frequency (in Hz) for a given FFT bin
	 */
	_binToFreq( bin ) {
		return bin * this.audioCtx.sampleRate / this.fftSize || 1; // returns 1 for bin 0
	}

	/**
	 * Compute all internal data required for the analyzer, based on its current settings
	 */
	_calcBars() {
		const bars = this._bars = []; // initialize object property

		if ( ! this._ready )
			return;

		const barSpace    = this._barSpace,
		 	  canvas      = this.canvas,
			  centerX     = canvas.width >> 1,
			  chLayout    = this._chLayout,
			  isAnsiBands = this._ansiBands,
			  isRadial    = this._radial,
			  isDual      = chLayout == CHANNEL_VERTICAL && ! isRadial,
			  maxFreq     = this._maxFreq,
			  minFreq     = this._minFreq,
			  mode        = this._mode,

			  // COMPUTE FLAGS

			  isBands   = mode % 10 != 0,
			  isOctaves = isBands && this._frequencyScale == SCALE_LOG,
			  isLeds    = this._showLeds && isBands && ! isRadial,
			  isLumi    = this._lumiBars && isBands && ! isRadial,
			  isAlpha   = this._alphaBars && ! isLumi && mode != 10,
			  isOutline = this._outlineBars && isBands && ! isLumi && ! isLeds,
			  isRound   = this._roundBars && isBands && ! isLumi && ! isLeds,
			  noLedGap  = chLayout != CHANNEL_VERTICAL || this._reflexRatio > 0 && ! isLumi,

			  // COMPUTE AUXILIARY VALUES

			  // channelHeight is the total canvas height dedicated to each channel, including the reflex area, if any)
			  channelHeight  = canvas.height - ( isDual && ! isLeds ? .5 : 0 ) >> isDual,
			  // analyzerHeight is the effective height used to render the analyzer, excluding the reflex area
			  analyzerHeight = channelHeight * ( isLumi || isRadial ? 1 : 1 - this._reflexRatio ) | 0,

			  analyzerWidth  = canvas.width - centerX * ( this._mirror != 0 ),

			  // channelGap is **0** if isLedDisplay == true (LEDs already have spacing); **1** if canvas height is odd (windowed); **2** if it's even
			  // TODO: improve this, make it configurable?
			  channelGap     = isDual ? canvas.height - channelHeight * 2 : 0,

			  initialX       = centerX * ( this._mirror == -1 && ! isRadial ),
			  radius         = Math.min( canvas.width, canvas.height ) * ( chLayout == CHANNEL_VERTICAL ? .375 : .125 ) | 0;

		/**
		 *	CREATE ANALYZER BANDS
		 *
		 *	USES:
		 *		analyzerWidth
		 *		initialX
		 *		isBands
		 *		isOctaves
		 *
		 *	GENERATES:
		 *		bars (populates this._bars)
		 *		bardWidth
		 *		scaleMin
		 *		unitWidth
		 */

		// helper function
		// bar object: { posX, freq, freqLo, freqHi, binLo, binHi, ratioLo, ratioHi, peak, hold, value }
		const barsPush = args => bars.push( { ...args, peak: [0,0], hold: [0], value: [0] } );

		/*
			A simple interpolation is used to obtain an approximate amplitude value for any given frequency,
			from the available FFT data. We find the FFT bin which closer matches the desired frequency	and
			interpolate its value with that of the next adjacent bin, like so:

				v = v0 + ( v1 - v0 ) * ( log2( f / f0 ) / log2( f1 / f0 ) )
				                       \__________________________________/
				                                        |
				                                      ratio
				where:

				f  - desired frequency
				v  - amplitude (volume) of desired frequency
				f0 - frequency represented by the lower FFT bin
				f1 - frequency represented by the upper FFT bin
				v0 - amplitude of f0
				v1 - amplitude of f1

			ratio is calculated in advance here, to reduce computational complexity during real-time rendering.
		*/

		// helper function to calculate FFT bin and interpolation ratio for a given frequency
		const calcRatio = freq => {
			const bin   = this._freqToBin( freq, 'floor' ), // find closest FFT bin
				  lower = this._binToFreq( bin ),
				  upper = this._binToFreq( bin + 1 ),
				  ratio = Math.log2( freq / lower ) / Math.log2( upper / lower );

			return [ bin, ratio ];
		}

		let barWidth, scaleMin, unitWidth;

		if ( isOctaves ) {
			// helper function to round a value to a given number of significant digits
			// `atLeast` set to true prevents reducing the number of integer significant digits
			const roundSD = ( value, digits, atLeast ) => +value.toPrecision( atLeast ? Math.max( digits, 1 + Math.log10( value ) | 0 ) : digits );

			// helper function to find the nearest preferred number (Renard series) for a given value
			const nearestPreferred = value => {
				// R20 series is used here, as it provides closer approximations for 1/2 octave bands (non-standard)
				const preferred = [ 1, 1.12, 1.25, 1.4, 1.6, 1.8, 2, 2.24, 2.5, 2.8, 3.15, 3.55, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10 ],
					  power = Math.log10( value ) | 0,
					  normalized = value / 10 ** power;

				let i = 1;
				while ( i < preferred.length && normalized > preferred[ i ] )
					i++;

				if ( normalized - preferred[ i - 1 ] < preferred[ i ] - normalized )
					i--;

				return ( preferred[ i ] * 10 ** ( power + 5 ) | 0 ) / 1e5; // keep 5 significant digits
			}

			// ANSI standard octave bands use the base-10 frequency ratio, as preferred by [ANSI S1.11-2004, p.2]
			// The equal-tempered scale uses the base-2 ratio
			const bands = [0,24,12,8,6,4,3,2,1][ this._mode ],
				  bandWidth = isAnsiBands ? 10 ** ( 3 / ( bands * 10 ) ) : 2 ** ( 1 / bands ), // 10^(3/10N) or 2^(1/N)
				  halfBand  = bandWidth ** .5;

			let analyzerBars = [],
				currFreq = isAnsiBands ? 7.94328235 / ( bands % 2 ? 1 : halfBand ) : C_1;
				// For ANSI bands with even denominators (all except 1/1 and 1/3), the reference frequency (1 kHz)
				// must fall on the edges of a pair of adjacent bands, instead of midband [ANSI S1.11-2004, p.2]
				// In the equal-tempered scale, all midband frequencies represent a musical note or quarter-tone.

			do {
				let freq = currFreq; // midband frequency

				const freqLo = roundSD( freq / halfBand, 4, true ), // lower edge frequency
					  freqHi = roundSD( freq * halfBand, 4, true ), // upper edge frequency
					  [ binLo, ratioLo ] = calcRatio( freqLo ),
					  [ binHi, ratioHi ] = calcRatio( freqHi );

				// for 1/1, 1/2 and 1/3 ANSI bands, use the preferred numbers to find the nominal midband frequency
				// for 1/4 to 1/24, round to 2 or 3 significant digits, according to the MSD [ANSI S1.11-2004, p.12]
				if ( isAnsiBands )
					freq = bands < 4 ? nearestPreferred( freq ) : roundSD( freq, freq.toString()[0] < 5 ? 3 : 2 );
				else
					freq = roundSD( freq, 4, true );

				if ( freq >= minFreq )
					barsPush( { posX: 0, freq, freqLo, freqHi, binLo, binHi, ratioLo, ratioHi } );

				currFreq *= bandWidth;
			} while ( currFreq <= maxFreq );

			barWidth = analyzerWidth / bars.length;

			bars.forEach( ( bar, index ) => bar.posX = initialX + index * barWidth );

			const firstBar = bars[0],
				  lastBar  = bars[ bars.length - 1 ];

			scaleMin = this._freqScaling( firstBar.freqLo );
			unitWidth = analyzerWidth / ( this._freqScaling( lastBar.freqHi ) - scaleMin );

			// clamp edge frequencies to minFreq / maxFreq, if necessary
			// this is done after computing scaleMin and unitWidth, for the proper positioning of labels on the X-axis
			if ( firstBar.freqLo < minFreq ) {
				firstBar.freqLo = minFreq;
				[ firstBar.binLo, firstBar.ratioLo ] = calcRatio( minFreq );
			}

			if ( lastBar.freqHi > maxFreq ) {
				lastBar.freqHi = maxFreq;
				[ lastBar.binHi, lastBar.ratioHi ] = calcRatio( maxFreq );
			}
		}
		else if ( isBands ) { // a bands mode is selected, but frequency scale is not logarithmic

			const bands = [0,24,12,8,6,4,3,2,1][ this._mode ] * 10;

			const invFreqScaling = x => {
				switch ( this._frequencyScale ) {
					case SCALE_BARK :
						return 1960 / ( 26.81 / ( x + .53 ) - 1 );
					case SCALE_MEL :
						return 700 * ( 2 ** x - 1 );
					case SCALE_LINEAR :
						return x;
				}
			}

			barWidth = analyzerWidth / bands;

			scaleMin = this._freqScaling( minFreq );
			unitWidth = analyzerWidth / ( this._freqScaling( maxFreq ) - scaleMin );

			for ( let i = 0, posX = 0; i < bands; i++, posX += barWidth ) {
				const freqLo = invFreqScaling( scaleMin + posX / unitWidth ),
					  freq   = invFreqScaling( scaleMin + ( posX + barWidth / 2 ) / unitWidth ),
					  freqHi = invFreqScaling( scaleMin + ( posX + barWidth ) / unitWidth ),
					  [ binLo, ratioLo ] = calcRatio( freqLo ),
					  [ binHi, ratioHi ] = calcRatio( freqHi );

				barsPush( { posX: initialX + posX, freq, freqLo, freqHi, binLo, binHi, ratioLo, ratioHi } );
			}

		}
		else {	// Discrete frequencies modes
			barWidth = 1;

			scaleMin = this._freqScaling( minFreq );
			unitWidth = analyzerWidth / ( this._freqScaling( maxFreq ) - scaleMin );

			const minIndex = this._freqToBin( minFreq, 'floor' ),
				  maxIndex = this._freqToBin( maxFreq );

	 		let lastPos = -999;

			for ( let i = minIndex; i <= maxIndex; i++ ) {
				const freq = this._binToFreq( i ), // frequency represented by this index
					  posX = initialX + Math.round( unitWidth * ( this._freqScaling( freq ) - scaleMin ) ); // avoid fractionary pixel values

				// if it's on a different X-coordinate, create a new bar for this frequency
				if ( posX > lastPos ) {
					barsPush( { posX, freq, freqLo: freq, freqHi: freq, binLo: i, binHi: i, ratioLo: 0, ratioHi: 0 } );
					lastPos = posX;
				} // otherwise, add this frequency to the last bar's range
				else if ( bars.length ) {
					const lastBar = bars[ bars.length - 1 ];
					lastBar.binHi = i;
					lastBar.freqHi = freq;
					lastBar.freq = ( lastBar.freqLo * freq ) ** .5; // compute center frequency (geometric mean)
				}
			}
		}

		/**
		 *  COMPUTE ATTRIBUTES FOR THE LED BARS
		 *
		 *	USES:
		 *		analyzerHeight
		 *		barWidth
		 *		noLedGap
		 *
		 *	GENERATES:
		 * 		spaceH
		 * 		spaceV
		 *		this._leds
		 */

		let spaceH = 0,
			spaceV = 0;

		if ( isLeds ) {
			// adjustment for high pixel-ratio values on low-resolution screens (Android TV)
			const dPR = this._pixelRatio / ( window.devicePixelRatio > 1 && window.screen.height <= 540 ? 2 : 1 );

			const params = [ [],
				[ 128,  3, .45  ], // mode 1
				[ 128,  4, .225 ], // mode 2
				[  96,  6, .225 ], // mode 3
				[  80,  6, .225 ], // mode 4
				[  80,  6, .125 ], // mode 5
				[  64,  6, .125 ], // mode 6
				[  48,  8, .125 ], // mode 7
				[  24, 16, .125 ], // mode 8
			];

			// use custom LED parameters if set, or the default parameters for the current mode
			const customParams = this._ledParams,
				  [ maxLeds, spaceVRatio, spaceHRatio ] = customParams || params[ mode ];

			let ledCount, maxHeight = analyzerHeight;

			if ( customParams ) {
				const minHeight = 2 * dPR;
				let blockHeight;
				ledCount = maxLeds + 1;
				do {
					ledCount--;
					blockHeight = maxHeight / ledCount / ( 1 + spaceVRatio );
					spaceV = blockHeight * spaceVRatio;
				} while ( ( blockHeight < minHeight || spaceV < minHeight ) && ledCount > 1 );
			}
			else {
				// calculate vertical spacing - aim for the reference ratio, but make sure it's at least 2px
				const refRatio = 540 / spaceVRatio;
				spaceV = Math.min( spaceVRatio * dPR, Math.max( 2, maxHeight / refRatio + .1 | 0 ) );
			}

			// remove the extra spacing below the last line of LEDs
			if ( noLedGap )
				maxHeight += spaceV;

			// recalculate the number of leds, considering the effective spaceV
			if ( ! customParams )
				ledCount = Math.min( maxLeds, maxHeight / ( spaceV * 2 ) | 0 );

			spaceH = spaceHRatio >= 1 ? spaceHRatio : barWidth * spaceHRatio;

			this._leds = [
				ledCount,
				spaceH,
				spaceV,
				maxHeight / ledCount - spaceV // ledHeight
			];
		}

		// COMPUTE ADDITIONAL BAR POSITIONING, ACCORDING TO THE CURRENT SETTINGS
		// uses: barSpace, barWidth, spaceH

		const barSpacePx = Math.min( barWidth - 1, barSpace * ( barSpace > 0 && barSpace < 1 ? barWidth : 1 ) );

		if ( isBands )
			barWidth -= Math.max( isLeds ? spaceH : 0, barSpacePx );

		bars.forEach( ( bar, index ) => {
			let posX  = bar.posX,
				width = barWidth;

			// in bands modes we need to update bar.posX to account for bar/led spacing

			if ( isBands ) {
				if ( barSpace == 0 && ! isLeds ) {
					// when barSpace == 0 use integer values for perfect gapless positioning
					posX |= 0;
					width |= 0;
					if ( index > 0 && posX > bars[ index - 1 ].posX + bars[ index - 1 ].width ) {
						posX--;
						width++;
					}
				}
				else
					posX += Math.max( ( isLeds ? spaceH : 0 ), barSpacePx ) / 2;

				bar.posX = posX; // update
			}

			bar.barCenter = posX + ( barWidth == 1 ? 0 : width / 2 );
			bar.width = width;
		});

		// COMPUTE CHANNEL COORDINATES (uses spaceV)

		const channelCoords = [];
		for ( const channel of [0,1] ) {
			const channelTop     = chLayout == CHANNEL_VERTICAL ? ( channelHeight + channelGap ) * channel : 0,
				  channelBottom  = channelTop + channelHeight,
				  analyzerBottom = channelTop + analyzerHeight - ( ! isLeds || noLedGap ? 0 : spaceV );

			channelCoords.push( { channelTop, channelBottom, analyzerBottom } );
		}

		// SAVE INTERNAL PROPERTIES

		this._aux = { analyzerHeight, analyzerWidth, channelCoords, channelHeight, channelGap, initialX, radius, scaleMin, unitWidth };
		this._flg = { isAlpha, isBands, isLeds, isLumi, isOctaves, isOutline, isRound, noLedGap };

		// generate the X-axis and radial scales
	//	this._createScales();
	}

	

	/**
	 * Computes bars and stuff only WJF
	 */
	_compute( timestamp ) {
		
	}

	/**
	 * Redraw the canvas
	 * this is called 60 times per second by requestAnimationFrame()
	 */
	_draw( timestamp ) {
		const { isAlpha, isBands, isLeds, isLumi,
			    isOctaves, isOutline, isRound, noLedGap } = this._flg,
			  ctx            = this._canvasCtx,
			  canvas         = ctx.canvas,
			  centerX        = canvas.width >> 1,
			  centerY        = canvas.height >> 1,
			  energy         = this._energy,
			  isOverlay      = this.overlay,
			  isRadial       = this._radial,
			  channelLayout  = this._chLayout,
			  { analyzerHeight, channelCoords, radius } = this._aux,
			  showBgColor    = this.showBgColor,
			  maxBarHeight   = isRadial ? Math.min( centerX, centerY ) - radius : analyzerHeight,
			  weightingFilter= this._weightingFilter;

		if ( energy.val > 0 )
			this._spinAngle += this._spinSpeed * RPM;

		/* HELPER FUNCTIONS */

		// returns the gain (in dB) for a given frequency, considering the currently selected weighting filter
		const weightingdB = freq => {
			const f2 = freq ** 2,
				  SQ20_6  = 424.36,
				  SQ107_7 = 11599.29,
				  SQ158_5 = 25122.25,
				  SQ737_9 = 544496.41,
				  SQ12194 = 148693636,
				  linearTodB = value => 20 * Math.log10( value );

			switch ( weightingFilter ) {
				case FILTER_A : // A-weighting https://en.wikipedia.org/wiki/A-weighting
					const rA = ( SQ12194 * f2 ** 2 ) / ( ( f2 + SQ20_6 ) * Math.sqrt( ( f2 + SQ107_7 ) * ( f2 + SQ737_9 ) ) * ( f2 + SQ12194 ) );
					return 2 + linearTodB( rA );

				case FILTER_B :
					const rB = ( SQ12194 * f2 * freq ) / ( ( f2 + SQ20_6 ) * Math.sqrt( f2 + SQ158_5 ) * ( f2 + SQ12194 ) );
					return .17 + linearTodB( rB );

				case FILTER_C :
					const rC = ( SQ12194 * f2 ) / ( ( f2 + SQ20_6 ) * ( f2 + SQ12194 ) );
					return .06 + linearTodB( rC );

				case FILTER_D :
					const h = ( ( 1037918.48 - f2 ) ** 2 + 1080768.16 * f2 ) / ( ( 9837328 - f2 ) ** 2 + 11723776 * f2 ),
						  rD = ( freq / 6.8966888496476e-5 ) * Math.sqrt( h / ( ( f2 + 79919.29 ) * ( f2 + 1345600 ) ) );
					return linearTodB( rD );

				case FILTER_468 : // ITU-R 468 https://en.wikipedia.org/wiki/ITU-R_468_noise_weighting
					const h1 = -4.737338981378384e-24 * freq ** 6 + 2.043828333606125e-15 * freq ** 4 - 1.363894795463638e-7 * f2 + 1,
						  h2 = 1.306612257412824e-19 * freq ** 5 - 2.118150887518656e-11 * freq ** 3 + 5.559488023498642e-4 * freq,
						  rI = 1.246332637532143e-4 * freq / Math.hypot( h1, h2 );
					return 18.2 + linearTodB( rI );
			}

			return 0; // unknown filter
		}


		// update energy information
		const updateEnergy = newVal => {
			energy.val = newVal;
			if ( newVal >= energy.peak ) {
				energy.peak = newVal;
				energy.hold = 30;
			}
			else {
				if ( energy.hold > 0 )
					energy.hold--;
				else if ( energy.peak > 0 )
					energy.peak *= ( 30 + energy.hold-- ) / 30; // decay (drops to zero in 30 frames)
			}
		}

		// calculate and display (if enabled) the current frame rate
		const updateFPS = () => {
			this._frame++;
			const elapsed = timestamp - this._time;

			if ( elapsed >= 1000 ) {
				this._fps = this._frame / ( elapsed / 1000 );
				this._frame = 0;
				this._time = timestamp;
			}
			
		}

		/* MAIN FUNCTION */

		let currentEnergy = 0;

		const bars      = this._bars,
			  nBars     = bars.length,
			  nChannels = channelLayout == CHANNEL_SINGLE ? 1 : 2;

		for ( let channel = 0; channel < nChannels; channel++ ) {


			// helper function for FFT data interpolation (uses fftData)
			const interpolate = ( bin, ratio ) => {
				const value = fftData[ bin ] + ( bin < fftData.length - 1 ? ( fftData[ bin + 1 ] - fftData[ bin ] ) * ratio : 0 );
				return isNaN( value ) ? -Infinity : value;
			}

			

			// get a new array of data from the FFT
			let fftData = this._fftData[ channel ];
			this._analyzer[ channel ].getFloatFrequencyData( fftData );

			// apply weighting
			if ( weightingFilter )
				fftData = fftData.map( ( val, idx ) => val + weightingdB( this._binToFreq( idx ) ) );

			// start drawing path (for mode 10)

			// store line graph points to create mirror effect in radial mode
			let points = [];

			// draw bars / lines

			for ( let barIndex = 0; barIndex < nBars; barIndex++ ) {

				const bar = bars[ barIndex ],
					  { posX, barCenter, width, freq, binLo, binHi, ratioLo, ratioHi } = bar;

				let barValue = Math.max( interpolate( binLo, ratioLo ), interpolate( binHi, ratioHi ) );

				// check additional bins (if any) for this bar and keep the highest value
				for ( let j = binLo + 1; j < binHi; j++ ) {
					if ( fftData[ j ] > barValue )
						barValue = fftData[ j ];
				}

				// normalize bar amplitude in [0;1] range
				barValue = this._normalizedB( barValue );

				bar.value[ channel ] = barValue;
				currentEnergy += barValue;

				// update bar peak
				if ( bar.peak[ channel ] > 0 ) {
					bar.hold[ channel ]--;
					// if hold is negative, it becomes the "acceleration" for peak drop
					if ( bar.hold[ channel ] < 0 )
						bar.peak[ channel ] += bar.hold[ channel ] / maxBarHeight;
				}

				// check if it's a new peak for this bar
				if ( barValue >= bar.peak[ channel ] ) {
					bar.peak[ channel ] = barValue;
					bar.hold[ channel ] = 30; // set peak hold time to 30 frames (0.5s)
				}


			} // for ( let barIndex = 0; barIndex < nBars; barIndex++ )

			


		} // for ( let channel = 0; channel < nChannels; channel++ ) {

		updateEnergy( currentEnergy / ( nBars << ( nChannels - 1 ) ) );

		// calculate and display (if enabled) the current frame rate
		updateFPS();

		if( this.onDataUpdate ){
			this.onDataUpdate( this, { timestamp } );
		}

		// schedule next update
		this._runId = setTimeout( this._draw.bind(this), 100 );
	}

	/**
	 * Return scaled frequency according to the selected scale
	 */
	_freqScaling( freq ) {
		switch ( this._frequencyScale ) {
			case SCALE_LOG :
				return Math.log2( freq );
			case SCALE_BARK :
				return ( 26.81 * freq ) / ( 1960 + freq ) - .53;
			case SCALE_MEL :
				return Math.log2( 1 + freq / 700 );
			case SCALE_LINEAR :
				return freq;
		}
	}

	/**
	 * Return the FFT data bin (array index) which represents a given frequency
	 */
	_freqToBin( freq, method = 'round' ) {
		const max = this._analyzer[0].frequencyBinCount - 1,
			  bin = Math[ method ]( freq * this.fftSize / this.audioCtx.sampleRate );

		return bin < max ? bin : max;
	}


	/**
	 * Normalize a dB value in the [0;1] range
	 */
	_normalizedB( value ) {
		const isLinear   = this._linearAmplitude,
			  boost      = isLinear ? 1 / this._linearBoost : 1,
			  clamp      = ( val, min, max ) => val <= min ? min : val >= max ? max : val,
			  dBToLinear = val => 10 ** ( val / 20 );

		let maxValue = this.maxDecibels,
			minValue = this.minDecibels;

		if ( isLinear ) {
			maxValue = dBToLinear( maxValue );
			minValue = dBToLinear( minValue );
			value = dBToLinear( value ) ** boost;
		}

		return clamp( ( value - minValue ) / ( maxValue - minValue ) ** boost, 0, 1 );
	}


	/**
	 * Select a gradient for one or both channels
	 *
	 * @param {string} name gradient name
	 * @param [{number}] desired channel (0 or 1) - if empty or invalid, sets both channels
	 */

	/**
	 * Set object properties
	 */
	_setProps( options, useDefaults ) {

		// settings defaults
		const defaults = {
			channelLayout  : CHANNEL_SINGLE,
			fftSize        : 8192,
			fillAlpha      : 1,
			frequencyScale : SCALE_LOG,
			linearAmplitude: false,
			linearBoost    : 1,
			lineWidth      : 0,
			loRes          : false,
			maxDecibels    : -25,
			maxFreq        : 22000,
			minDecibels    : -85,
			minFreq        : 20,
			mirror         : 0,
			mode           : 0,
			smoothing      : 0.5,
			spinSpeed      : 0,
			start          : true,
			volume         : 1,
			weightingFilter: FILTER_NONE
		};

		// callback functions properties
		const callbacks = [ 'onDataUpdate' ];

		// properties undefined by default
		const defaultUndefined = [ 'stereo' ];

		// build an array of valid properties; `start` is not an actual property and is handled after setting everything else
		const validProps = Object.keys( defaults ).filter( e => e != 'start' ).concat( callbacks, defaultUndefined );

		if ( useDefaults || options === undefined )
			options = { ...defaults, ...options }; // merge options with defaults

		for ( const prop of Object.keys( options ) ) {
			if ( callbacks.includes( prop ) && typeof options[ prop ] !== 'function' ) // check invalid callback
				this[ prop ] = undefined;
			else if ( validProps.includes( prop ) ) // set only valid properties
				this[ prop ] = options[ prop ];
		}

		if ( options.start !== undefined )
			this.toggleAnalyzer( options.start );
	}

}