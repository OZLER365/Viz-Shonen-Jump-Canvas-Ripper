# Viz & Shonen Jump Canvas Ripper

A lightweight Tampermonkey userscript designed to extract rendered canvases directly from Viz and Shonen Jump. It filters out off-screen preloads and uses visual hashing to capture high-quality manga pages without duplicates.

## ✨ Core Features

* **Visual Deduplication:** Uses a lightweight 50x50 off-screen canvas to hash and identify unique pages in real-time, preventing duplicate downloads without lagging your browser.
* **RTL Optimization:** Automatically sorts canvases from right to left, ensuring that double-page spreads are registered and saved in the correct reading order.
* **Floating UI:** Features a dark-themed, draggable, and minimizable control panel to track captured pages and trigger downloads.
* **Direct Folder Export:** Downloads full-resolution PNGs sequentially to a folder named after the chapter (Note: ZIP extraction is not supported).

## 🚀 Installation & Usage

1. **Prerequisite:** Install the **Tampermonkey** browser extension.
2. **Install Script:** Add the userscript via my Greasyfork profile.
3. **Manual Scrolling (CRITICAL):** Page order depends entirely on how the images load. You **must** load the pages slowly, wait for the canvas to render fully, and then press the arrow key or click to proceed to the next image.
4. **Download:** Click the button on the floating UI to save the captured PNGs to your device.

## ⚠️ Disclaimer

**This script is strictly for educational purposes.** Please support the original creators and publishers. Do not repost or distribute the downloaded images.

## 🔗 Links, Feedback & Support

* **Greasyfork Scripts:** [ozler365's Profile](https://greasyfork.org/en/users/1553223-ozler365)
* **GitHub Repositories:** [ozler-s-works-info](https://ozler365.github.io/ozler-s-works-info/#/repositories)
* **Support the Developer:** Keep this script updated by leaving a small donation at [Buy Me a Coffee (ozler)](https://buymeacoffee.com/ozler).

For queries, bug reports, or feature requests, please leave a review on Greasyfork or email **devjk6918@gmail.com**.
