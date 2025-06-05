// ==UserScript==
// @name         Learning Ware Tweaks
// @namespace    http://tampermonkey.net/
// @version      1.9.2
// @description  Tweaks for Learning Ware
// @author       kok644312
// @match        https://*.learning-ware.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.pro-seeds.com
// @run-at       document-start
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.min.js
// ==/UserScript==

(function() {
    'use strict';

    const getParam = (key) => {
        return new URL(decodeURIComponent(document.location.href)).searchParams.get(key);
    };

    /* Face verification Tweaks */
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;

    navigator.mediaDevices.getUserMedia = function(constraints) {
        if (constraints && constraints.video && localStorage.getItem("imageDataUrl") !== null) {
            return new Promise((resolve, reject) => {
                const imgElem = new Image();

                imgElem.addEventListener("load", () => {
                    const canvasElem = document.createElement("canvas");
                    canvasElem.width = imgElem.width;
                    canvasElem.height = imgElem.height;

                    const canvasCtx = canvasElem.getContext("2d");
                    canvasCtx.drawImage(imgElem, 0, 0, imgElem.width, imgElem.height);

                    resolve(canvasElem.captureStream(30));
                });

                imgElem.src = localStorage.getItem("imageDataUrl");
            });
        } else {
            return originalGetUserMedia.call(navigator.mediaDevices, constraints);
        }
    };

    if (location.pathname == "/lesson/face-verification" || location.pathname == "/login/face-verification") {
        document.addEventListener("DOMContentLoaded", () => {
            const chooseImageBtn = document.createElement("button");
            const chooseImageElem = document.createElement("input");

            chooseImageBtn.classList.add("btn", "btn-lg", "mod-btn1", "btn-block");
            chooseImageBtn.innerHTML = "画像を選択";

            chooseImageBtn.addEventListener("click", () => {
                chooseImageElem.click();
            });

            chooseImageElem.accept = "image/*";
            chooseImageElem.type = "file";
            chooseImageElem.style.display = "none";

            chooseImageElem.addEventListener("change", event => {
                if (event.target.files.length !== 1 || !event.target.files[0].type.startsWith('image/')) {
                    return;
                }

                imageCompression(event.target.files[0], {
                    maxSizeMB: 1,
                    useWebWorker: true,
                }).then(compressedFile => {
                    const imageReader = new FileReader();
                    imageReader.addEventListener("load", event => {
                        localStorage.setItem("imageDataUrl", event.target.result);

                        location.reload();
                    });

                    imageReader.readAsDataURL(compressedFile);
                });
            });

            document.querySelector("#face-center-webcam>div:last-child>p:first-child").append(chooseImageBtn);
            document.body.append(chooseImageElem);
        });
    }

    /* Lesson Tweaks */
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'blur') {
            console.log('blocked blur event');
            return;
        }

        return originalAddEventListener.call(this, type, listener, options);
    };

    document.addEventListener("DOMContentLoaded", () => {
        if(location.pathname != "/lesson/detail") {
            return;
        }

        let styleElem = document.createElement("style");
        styleElem.innerHTML = `
        .outdated {
          filter: hue-rotate(90deg);
        }
        `;

        document.body.append(styleElem);

        for(let lessonElem of document.querySelectorAll(".nolink")) {
            lessonElem.classList.remove("nolink");
            lessonElem.classList.add("outdated");

            lessonElem.addEventListener("click", function() {
                let unitId = this.id.split("-")[1];

                fetch(`/api/lesson/set-unit-complete?UserLearningLessonId=${getParam("id")}&UnitId=${unitId}`).then(data => {
                    location.reload();
                });
            });
        }
    });

    new MutationObserver((_, observer) => {
        if(location.pathname != "/lesson/detail") {
            observer.disconnect();
            return;
        }

        if(window.windowOpenPost == undefined) return;

        window.windowOpenPost = (url, name, attr) => {
            return window.open(url, "_blank", attr);
        };

        observer.disconnect();
    }).observe(document, {childList: true, subtree: true});

    /* Player Tweaks */
    new MutationObserver((_, observer) => {
        if(location.pathname != "/lesson/pmovie" && location.pathname != "/data/lesson/lessondata/frame.html") {
            observer.disconnect();
            return;
        }

        let videoElem = document.getElementById("streaming_video");
        let playbackRateElem = document.getElementById("streaming_video_fluid_control_video_playback_rate");
        if(videoElem == null) return;

        videoElem.dataset.isskip = "0";
        videoElem.dataset.isallowedplaybackrate = "1";

        observer.disconnect();
    }).observe(document, {childList: true, subtree: true});

    new MutationObserver((_, observer) => {
        if(location.pathname != "/lesson/pmovie" && location.pathname != "/data/lesson/lessondata/frame.html") {
            observer.disconnect();
            return;
        }

        let videoElem = document.getElementById("streaming_video");
        let playbackRateElem = document.getElementById("streaming_video_fluid_control_video_playback_rate");
        if(videoElem == null || playbackRateElem == null) return;

        for(let rate of [4, 8, 16]) {
            let rateElem = document.createElement("div");
            rateElem.addEventListener("click", () => {
                window.fluidPlayerClass.getInstanceById("streaming_video").setPlaybackSpeed(rate);
            });
            rateElem.classList.add("fluid_video_playback_rates_item");
            rateElem.innerHTML = "x" + rate;
            playbackRateElem.prepend(rateElem);
        }

        observer.disconnect();
    }).observe(document, {childList: true, subtree: true});

    /* Nav Tweaks */
    new MutationObserver((_, observer) => {
        if(location.pathname != "/lesson/navigation") {
            observer.disconnect();
            return;
        }

        if(window.proseeds == undefined || window.proseeds.lesson == undefined || window.proseeds.lesson.GetLearningStatus == undefined) return;

        let btnContainerElem = document.querySelector(".rbox");
        let endBtnElem = document.getElementById("end");

        let completeBtnElem = document.createElement("button");
        let completeBtnIconElem = document.createElement("span");

        completeBtnElem.id = "complete";
        completeBtnElem.disabled = true;

        completeBtnElem.addEventListener("click", () => {
            const params = new URL(window.location).searchParams;

            const processStr = (str) => {
                const strLen = str.length;
                const chr = String.fromCharCode(...crypto.getRandomValues(new Uint8Array(0x4)));
                const strb64 = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(strLen)))).substring(0x0, strLen).split('');
                const nStr = str.split('').map((chr, chrIndex) => strb64[chrIndex] + chr).join('');
                return btoa(nStr + '|' + chr);
            };

            fetch("/api/lesson/complete-pmovie", {
                method: "POST",
                headers: {
                    "gftwkiw": processStr(params.get("UserLearningLessonId")),
                    "htsgrfg": processStr(params.get("UnitId")),
                    "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
                },
            }).then(res => {
                return res.json()
            }).then(data => {
                if (data.result === "success") {
                    location.reload();
                } else {
                    alert("レッスン記録を保存できませんでした");
                }
            });
        });

        completeBtnIconElem.classList.add("glyphicon");
        completeBtnIconElem.classList.add("glyphicon-check");

        completeBtnElem.append(completeBtnIconElem);
        completeBtnElem.append(document.createElement("br"));
        completeBtnElem.append(document.createTextNode("完了"));

        const customStyleElem = document.createElement("style");
        customStyleElem.innerHTML = `
        @media (max-width: 768px) {
          .rbox button {
            width: 15%!important;
          }
        }
        `;

        document.body.append(customStyleElem);
        btnContainerElem.insertBefore(completeBtnElem, endBtnElem);

        window.proseeds.lesson.GetLearningStatus((_1, isCompleted) => {
            if(isCompleted !== 1) {
                completeBtnElem.disabled = false;
                completeBtnElem.classList.add("touchable");
            }
        });

        observer.disconnect();
    }).observe(document, {childList: true, subtree: true});
})();
