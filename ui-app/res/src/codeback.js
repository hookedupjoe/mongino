const clientId = "8c6fbd3365a34ef5a07e4d4a9662c5c8";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    //const accessToken = await getAccessToken(clientId, code);
    //sessionStorage.setItem('spotifyAccessToken', accessToken);
    sessionStorage.setItem('codebackcode', code);
    window.location = '/SpotifyController/'
    // const profile = await fetchProfile(accessToken);
    // console.log(profile); // Profile data logs to console
    // populateUI(profile);
}

export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");
    console.log('v read',verifier)

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:33480/codeback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}



async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

//--- Temp: ToDo: Fix
function populateUI(profile) {
  ActionAppCore.spotifyProfile = profile;
}

export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    //localStorage.setItem("verifier set", verifier);
    localStorage.setItem("verifier", verifier);
    console.log('set verifier',verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:33480/codeback");
    params.append("scope", "user-read-private user-read-email user-read-playback-state user-modify-playback-state user-read-currently-playing");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

