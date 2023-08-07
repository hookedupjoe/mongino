const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    console.error('this endpoint used for code callback redirects only')
} else {
    sessionStorage.setItem('codebackcode', code);
    var tmpToApp = sessionStorage.getItem('codebackto') || '/';
    if( !(tmpToApp) ){
        console.error('incorrect usage, should provide the codebackto page')
    } else {
        window.location = '/' + tmpToApp + '/'
    }
}

