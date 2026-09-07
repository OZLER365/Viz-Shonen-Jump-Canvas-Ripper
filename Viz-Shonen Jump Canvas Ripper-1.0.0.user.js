// ==UserScript==
// @name         Viz/Shonen Jump Canvas Ripper
// @namespace    https://greasyfork.org/en/users/1553223-ozler365
// @version      1.0.0
// @description  Extracts Rendered Canvas, Filters Off-Screen Preloads, Optimized for RTL Manga
// @author       ozler365
// @license      MIT
// @match        https://www.viz.com/shonenjump/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAPFBMVEX/AAD/AAD/vb3/ycn/zc3/Cwv/gID/bGz/qan/8/P/////JSX/sLD/jIz/2dn/Ojr/oaH/YWH/Skr/6Oj7Q/lRAAAAAXRSTlNoA48xDAAAAIBJREFUeAHl0oURgDAAA8C6pDj770q9+ACQ09xDnRD6GG8v+RYyLiSlSghNBTe+prCIFnCUdkBPgSHUGBtxADSl5oyIaAC+w9FN4b9pjjgCmBtS5bupq2W+LVNBGa1inGYtOPniRp+M0gsKrocFhUwNcdhKiuryIYh2CL95CeTFNr6eCU7g+6zBAAAAAElFTkSuQmCC
// @contributionURL https://www.buymeacoffee.com/ozler
// @run-at       document-idle
// @grant        GM_download
// @downloadURL https://update.greasyfork.org/scripts/594590/VizShonen%20Jump%20Canvas%20Ripper.user.js
// @updateURL https://update.greasyfork.org/scripts/594590/VizShonen%20Jump%20Canvas%20Ripper.meta.js
// ==/UserScript==

(function() {
    'use strict';

    const state = {
        pageRegistry: new Map(),
        seenHashes: new Set(),
        isDownloading: false,
        currentHref: window.location.href,
        cachedFolderName: null,
        cachedProgressEl: null
    };

    // Offscreen canvas for ultra-lightweight performance hashing
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 50;
    thumbCanvas.height = 50;
    const thumbCtx = thumbCanvas.getContext('2d', { willReadFrequently: true });

    function setStatus(msg, isError = false) {
        const statusEl = document.getElementById('lz-status');
        if (!statusEl) return;
        if (!msg) {
            statusEl.style.display = 'none';
            return;
        }
        statusEl.style.display = 'block';
        statusEl.style.color = isError ? '#ff4c4c' : '#00e676';
        statusEl.innerText = msg;
    }

    function getFolderName() {
        if (state.cachedFolderName) return state.cachedFolderName;
        
        let name = document.title;
        // Safely strip illegal OS folder characters, control characters, and newlines
        name = name.replace(/[\\/:*?"<>|\x00-\x1F\r\n]/g, " ");
        // Clean up double spaces created by the replacement
        state.cachedFolderName = name.replace(/\s+/g, " ").trim() || "Chapter_Download";
        
        return state.cachedFolderName;
    }

    function resetState() {
        state.pageRegistry.clear();
        state.seenHashes.clear();
        state.isDownloading = false;
        state.cachedFolderName = null;
        state.cachedProgressEl = null;

        const mainBtn = document.getElementById('lz-main-btn');
        if (mainBtn) {
            mainBtn.innerText = "Download Folder";
            mainBtn.style.background = "#e60012";
            mainBtn.disabled = false;
        }
        setStatus('');
        updateUI();
    }

    function getTotalPanels() {
        const regex = /^(\d+)\s*\/\s*(\d+)$/;
        if (state.cachedProgressEl && state.cachedProgressEl.offsetParent !== null) {
            const match = state.cachedProgressEl.innerText.trim().match(regex);
            if (match) return parseInt(match[2], 10);
        }

        const elements = document.querySelectorAll('div, span, p, button');
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].offsetParent === null) continue;
            const match = elements[i].innerText.trim().match(regex);
            if (match) {
                state.cachedProgressEl = elements[i];
                return parseInt(match[2], 10);
            }
        }
        return null;
    }

    function syncCanvases() {
        if (state.isDownloading) return;

        // Grab all canvases, filter out UI elements, AND filter out off-screen preloaded pages
        const canvases = Array.from(document.querySelectorAll('canvas'))
            .filter(c => c.width >= 300 && c.height >= 500)
            .filter(c => {
                const rect = c.getBoundingClientRect();
                // Viewport Check: Ensures we only capture canvases physically visible on the monitor
                return (
                    rect.right > 0 && 
                    rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
                    rect.bottom > 0 &&
                    rect.top < (window.innerHeight || document.documentElement.clientHeight)
                );
            });
        
        if (canvases.length === 0) return;

        // Sort Right-to-Left (Manga Reading Order) so spreads are registered correctly
        canvases.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return rectB.left - rectA.left; 
        });

        canvases.forEach(canvas => {
            // Create a 50x50 visual hash of the page to detect new pages without lagging the system
            thumbCtx.clearRect(0, 0, 50, 50);
            thumbCtx.drawImage(canvas, 0, 0, 50, 50);
            const visualHash = thumbCanvas.toDataURL('image/jpeg', 0.5);

            // Blank canvas check (bypasses empty frames while they load)
            if (visualHash.length < 1500) return; 

            if (!state.seenHashes.has(visualHash)) {
                state.seenHashes.add(visualHash);

                // Export the actual full-resolution canvas
                canvas.toBlob((blob) => {
                    if (blob) {
                        const pageNum = state.pageRegistry.size + 1;
                        state.pageRegistry.set(pageNum, {
                            blob: blob,
                            url: URL.createObjectURL(blob)
                        });
                        updateUI();
                    }
                }, 'image/png');
            }
        });
    }

    async function downloadToFolder() {
        if (state.isDownloading) return;
        
        if (state.pageRegistry.size === 0) {
            setStatus('No pages captured yet!', true);
            return;
        }

        state.isDownloading = true; 
        const mainBtn = document.getElementById('lz-main-btn');
        setStatus('Saving PNGs...', false);
        mainBtn.innerText = "Downloading...";
        mainBtn.disabled = true;
        
        const cleanTitle = getFolderName();
        const sortedPages = Array.from(state.pageRegistry.entries()).sort((a, b) => a[0] - b[0]);
        const pad = Math.max(String(sortedPages[sortedPages.length - 1][0]).length, 3);

        for (const [pageNum, item] of sortedPages) {
            const filename = `Page_${String(pageNum).padStart(pad, '0')}.png`;
            const fullPath = `${cleanTitle}/${filename}`;

            GM_download({
                url: item.url,
                name: fullPath,
                saveAs: false,
                onerror: (e) => console.error(`Error downloading ${filename}:`, e)
            });

            await new Promise(r => setTimeout(r, 150)); 
        }

        mainBtn.innerText = "Done!";
        setStatus('Download complete!', false);
        setTimeout(() => {
            mainBtn.innerText = "Download Folder";
            mainBtn.style.background = "#e60012";
            mainBtn.disabled = false;
            state.isDownloading = false;
            setStatus('');
        }, 3000);
    }

    function updateUI() {
        const countEl = document.getElementById('lz-count');
        const totalEl = document.getElementById('lz-total');
        if (countEl) countEl.innerText = state.pageRegistry.size;

        const total = getTotalPanels();
        if (totalEl && total) {
            totalEl.innerText = `/ ${total}`;
        }
    }

    // Monitor for manual page turns
    setInterval(() => {
        if (window.location.href !== state.currentHref) {
            state.currentHref = window.location.href;
            resetState();
        }
        syncCanvases();
    }, 400);

    // --- UI INJECTION ---
    function initUI() {
        if (document.getElementById('lz-modal')) return;

        const style = document.createElement('style');
        style.textContent = `
            #lz-modal {
                position: fixed;
                top: 15%;
                right: 20px;
                z-index: 999999;
                background: #141416;
                color: #ffffff;
                padding: 14px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 10px 30px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.2);
                width: 230px;
                border: 1px solid #27272a;
                user-select: none;
            }
            #lz-header {
                cursor: grab;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 10px;
                border-bottom: 1px solid #27272a;
                margin-bottom: 12px;
            }
            #lz-header:active {
                cursor: grabbing;
            }
            .lz-title {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.8px;
                color: #e4e4e7;
            }
            .lz-min-btn {
                background: transparent;
                border: none;
                color: #a1a1aa;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                padding: 0 4px;
            }
            .lz-min-btn:hover {
                color: #ffffff;
            }
            .lz-support-link {
                color: #f0ad4e;
                text-decoration: none;
                font-size: 10px;
                display: block;
                margin-top: 8px;
                text-align: center;
            }
            .lz-support-link:hover {
                color: #ffffff;
            }
        `;
        document.head.appendChild(style);

        const ui = document.createElement('div');
        ui.id = 'lz-modal';
        ui.innerHTML = `
            <div id="lz-header">
                <span class="lz-title">VIZ RIPPER</span>
                <button class="lz-min-btn" id="lz-toggle-min">−</button>
            </div>
            <div id="lz-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #202024; padding: 8px 10px; border-radius: 6px;">
                    <span style="font-size: 13px; font-weight: 600; color: #00e676;">Captured: <span id="lz-count">0</span> <span id="lz-total" style="color:#71717a; font-size:12px;"></span></span>
                </div>
                
                <div id="lz-status" style="font-size: 11px; font-weight: 600; margin-bottom: 8px; text-align: center; display: none; line-height: 1.2;"></div>
                
                <button id="lz-main-btn" style="width: 100%; padding: 10px; background: #e60012; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s; margin-bottom: 8px;">Download Folder</button>
                
                <a href="https://www.buymeacoffee.com/ozler" target="_blank" class="lz-support-link">☕ Support the Developer</a>
            </div>
        `;
        document.body.appendChild(ui);

        const bodyEl = document.getElementById('lz-body');
        const minBtn = document.getElementById('lz-toggle-min');
        let isMinimized = false;
        minBtn.onclick = () => {
            isMinimized = !isMinimized;
            bodyEl.style.display = isMinimized ? 'none' : 'block';
            minBtn.innerText = isMinimized ? '+' : '−';
            ui.style.width = isMinimized ? '130px' : '230px';
        };

        const headerEl = document.getElementById('lz-header');
        let isDragging = false, startX, startY, initLeft, initTop;

        headerEl.addEventListener('mousedown', (e) => {
            if (e.target === minBtn) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = ui.getBoundingClientRect();
            initLeft = rect.left;
            initTop = rect.top;
            ui.style.right = 'auto';
            ui.style.left = `${initLeft}px`;
            ui.style.top = `${initTop}px`;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            ui.style.left = `${initLeft + (e.clientX - startX)}px`;
            ui.style.top = `${initTop + (e.clientY - startY)}px`;
        });

        window.addEventListener('mouseup', () => { isDragging = false; });

        document.getElementById('lz-main-btn').onclick = downloadToFolder;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }
})();