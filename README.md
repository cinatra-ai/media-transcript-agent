# Media Transcript Agent

Drop in an audio or video URL — including a YouTube watch link — and get back a clean, verbatim transcript with `[Speaker N]:` labels where multiple voices are present. Useful for turning podcast episodes, recorded calls, and interviews into searchable, quotable text.

Install from the Cinatra marketplace by searching for "Media Transcript Agent" and adding it to your workspace. No additional credentials are required; the agent uses your workspace's configured Gemini access via the platform LLM bridge.

To use the agent, provide a `mediaUrl` string: a YouTube watch URL or a direct audio/video file URL. Three optional fields add context: `title`, `description`, and `kind` (media type hint). The agent returns `transcript` (verbatim text), `kind` (echoed from input), and `mediaUrl` (echoed from input). Speaker labels appear as `[Speaker 1]:`, `[Speaker 2]:`, etc. when multiple voices are detected; single-voice recordings have no labels. Unintelligible passages are marked `[unclear]` rather than guessed.

A completed run persists `transcript` as a library artifact (a ref is returned in the run output), titled from `mediaUrl` (always present, unlike the optional `title`). No extra setup needed.

The agent routes every request to the platform LLM bridge, which selects Gemini with the `media_input` capability. YouTube URLs are passed as text for native video handling; other URLs are fetched and uploaded as media files. No configuration beyond workspace installation is required.

For local development, run `node extension-kind-gate.mjs --package-root .` to verify the extension manifest. No build step is needed — the agent is fully declarative via `cinatra/oas.json`.

If transcription returns errors, confirm the URL is publicly accessible and that the file is a supported audio or video format. If the entire output is `[unclear: entire audio is unintelligible]`, the media may be silent, corrupt, or in an unsupported language. For other errors, verify that Gemini access is enabled for your workspace.

## Works with

- YouTube
- Direct audio and video URLs

## Capabilities

- Transcribe a YouTube video from its watch URL
- Transcribe an audio or video file from a direct URL
- Label speakers automatically when multiple voices are present
- Preserve filler words, false starts, and cross-talk for verbatim accuracy
- Flag unintelligible passages instead of guessing
