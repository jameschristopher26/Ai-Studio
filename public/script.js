const textBox = document.getElementById("text");
const voiceSelect = document.getElementById("voice");
const generateButton = document.getElementById("generate");
const message = document.getElementById("message");
const result = document.getElementById("result");
const player = document.getElementById("player");
const download = document.getElementById("download");

let currentUrl = null;

textBox.addEventListener("input", () => {
    document.getElementById("count").textContent = `${textBox.value.length} / 5000`;
});

document.getElementById("clear").addEventListener("click", () => {
    textBox.value = "";
    textBox.dispatchEvent(new Event("input"));
    message.textContent = "";
});

generateButton.addEventListener("click", 
    async () => {
    const text = textBox.value.trim();

    if (!text) {
        message.textContent = "Please enter your text first.";
        return;
    }

    generateButton.disabled = true;
    generateButton.textContent = "Generating audio...";
    message.textContent = "Please wait while your voice is being generated.";
    result.hidden = true;

    try {
        const response = await fetch("api/tts", 
            {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                 text,
                voice: voiceSelect.value,
            })
        });

        if (!response.ok) {
            let errorMessage = "Speech generation failed.";
            try {
                const data = await response.json();
                errorMessage = data.error || errorMessage;
            } catch {}
            throw new Error(errorMessage);
        }


        const blob = await response.blob();

        if (!blob.size || blob.type !== "audio/mpeg") {
            throw new Error("The server do not return a valid MP3.");
        }

        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
        currentUrl = URL.createObjectURL(blob);

        player.src = currentUrl;
        download.href = currentUrl;
        download.download = "ai-studio-voice.mp3";
        result.hidden = false;
        message.textContent = "Your audio is ready.";

    } catch (error) {
        message.textContent = error.message || "Could not connect to the server.";
    } finally {
        generateButton.disabled = false;
        generateButton.innerHTML =  "<span></span> Generate Audio";

    }
});
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(console.error);
        });
    
}