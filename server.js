const express = require("express");
const { spawn } = require("child-process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.json({limit: "20kb"}));

app.use((req, res, next) => {
    res.setHeader("x-Content-Type-Options", "nosniff");
    next()
});

app.use(express.static(path.join(__dirname, "public")));

const voices = new Set([
    "en-US-AriaNeural",
    "en-US-GuyNeural",
    "en-GB-SoniaNeural",
]);

const recentRequests = new Map();

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/tts", async (req, res) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const last = recentRequests.get(ip) || 0;
})

//Simple per-process request throttle.
if (now - last < 3000){
    return res.status(429),json({
        error: "Please wait a few seconds before trying again." 
    });
}

const text = req.body?.text;
const voice = req.body?.voice;

if (typeof text !== "string" || text.trim().length === 0 || text.length > 5000) {
    return res.status(400).json({
        error: "Enter text between 1 and 5000 characters."
    });
}

if (!voices.has(voice)) {
    return res.status(400).json({
        error: "Please select a supported voice."
    });
}

recentRequests.set(ip, now);

//Avoid growing the simple throttle map indefinitely.
if (recentRequests.set > 1000) {
    recentRequests.clear();
}

const filename = path.join(
    os.tmpdir(),
    `ai-studio-${crypto.randomUUID()}.mp3`
);

const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "py" : "python3");

const args = [
    "-m", "edge_tts",
    "--voice", voice,
    "--text", text.trim(),
    "--write-media", filename

];

let child;
let timedout = false;
let finished = false;

const cleanup = () => {
    fs.promises.unlink(filename).catch(() => {});
};

const timer = setTimeout(() => {
    timedout = true;
     child?.kill(); 
     }, 90000);


     res.on("close", () => {
        if (!res.writableEnded && !finished) {
            child?.kill();
        }
     });

     try {
        child = spawn(python, args, {
            shell: false,
            windowsHide: true,
            studio: ["ignore", "ignore", "pipe"]
        });

        let errorOutput = "";
        child.stderr.on("data", chunk => {
            // keep error details bounded; don't log user text.
            errorOutput = (errorOutput + chunk.toString()).slice(-2000);
        });

        child.on("error", err => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            cleanup();

            if (!res.headersSent) {
                res.status(500).json({
                    error: "Could not start the speech engine. Check Python and edge-tts installation."
                });
            }
        });

        child.on("close", async code => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            try {
                if (timedout) {
                    if (!res.headersSent) {
                        res.status(504).json({
                            error: "Speech generation timed out. Try shorter text."
                        });
                    }
                    return;
                }
                if (code !== 0) {
                    console.error("Speech engine failed:", errorOutput);
                    if (!res.headersSent) {
                        res.status(502).json({
                            error: "Speech generation failed. Please try again."
                        });
                    }
                    return;
                }
                const stat = await fs.promises.stat(filename);
                if (!stat.isFile() || stat.size === 0 || stat.size > 15 * 1024 * 1024) {
                    if (!res.headersSent) {
                        res.status(502).json({
                            error: "The generated audio file is invalid or too large."
                        });
                    }
                    return;
                }

                res.setHeader("Content-Type", "audio/mpeg");
                res.setHeader("Content-Disposition", `attachment; filename="ai-studio-voice.mp3"`);
                res.setHeader("Cache-Control", "no-cache, no-store,");

                const stream = fs.createReadStream(filename);
                stream.on("error", () => {
                    if (!res.headersSent) {
                        res.status(500).json({
                            error: "Could not read audio."});
                        
                    } else {
                        res.destroy();
                    }
        });
        stream.on("close", cleanup);
        stream.pipe(res);
    } catch (err) {
        cleanup();
        if (!res.headersSent) {
            res.status(500).json({
                error: "An unexpected server error occurred."
            });
        }
    }
});

     } catch (err) {
        finished = true;
        clearTimeout(timer);
        cleanup();
        if (!res.headersSent) {
            res.status(500).json({
                error: "Could not generate audio." });
        }

    }



app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Studio TTS server is running on port ${PORT}`);
});