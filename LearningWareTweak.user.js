// ==UserScript==
// @name         Learning Ware Tweak
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Tweak for Learning Ware
// @author       kok644312
// @match        https://*.learning-ware.jp/lesson/pmovie*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.pro-seeds.com
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let hookedPlayerConfig = false;

    new MutationObserver((_, observer) => {
        if(hookedPlayerConfig) return;

        let videoElem = document.getElementById("streaming_video");
        if(videoElem == null) return;

        videoElem.dataset.isskip = "0";
        videoElem.dataset.isallowedplaybackrate = "1";

        console.log("Hooked Player!");
        hookedPlayerConfig = true;
        observer.disconnect();
    }).observe(document, {childList: true, subtree: true});
})();
