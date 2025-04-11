// ==UserScript==
// @name         Learning Ware Tweaks
// @namespace    http://tampermonkey.net/
// @version      1.7.0
// @description  Tweaks for Learning Ware
// @author       kok644312
// @match        https://*.learning-ware.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.pro-seeds.com
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const getParam = (key) => {
        return new URL(decodeURIComponent(document.location.href)).searchParams.get(key);
    };

    /* Login Tweaks */
    if(location.pathname == "/login/face-verification") {
        document.addEventListener("DOMContentLoaded", () => {
            const overlay = document.getElementById('overlay');
            const overlayCC = overlay.getContext('2d');
            const video = document.getElementById('video');

            const verifyFace = imageDataUrl => {
                $.ajax({
                    url: '/face-recognition/verify-face',
                    type: 'POST',
                    data : {'image': imageDataUrl, 'displayType': '1'},
                    async: false,
                }).success(function(data) {
                    if (data.confirm == true) {
                        localStorage.setItem("imageDataUrl", imageDataUrl);

                        $.notify({
                            icon: 'glyphicon glyphicon-ok',
                            message: polyglot.t('success.verifyFace'),
                        }, {
                            type: 'success',
                            placement : {
                            from: 'top',
                            align: 'center',
                        },
                            delay: 3000
                        });

                        let stream = video.srcObject;
                        video.srcObject = null;
                        stream?.getTracks().forEach(function(track) {
                            track.stop();
                        });

                        window.location.href = '/login/after-face-process';
                    } else {
                        $('#verify-face').prop('disabled', false);
                        $('#verify-face').html(polyglot.t('message.verifyButtonMessage'));
                        $.notify({
                            icon: 'glyphicon glyphicon-exclamation-sign',
                            message: polyglot.t('error.' + data.code),
                        }, {
                            type: 'danger',
                            placement : {
                                from: 'top',
                                align: 'center',
                            },
                            delay: 3000
                        });
                    }
                }).error(function(error) {
                    $.notify({
                        icon: 'glyphicon glyphicon-exclamation-sign',
                        message: polyglot.t('error.VerifyFaceError'),
                    }, {
                        type: 'danger',
                        placement : {
                            from: 'top',
                            align: 'center',
                        },
                        delay: 3000
                    });
                    $('#verify-face').prop('disabled', false);
                });
            };

            if (localStorage.getItem("imageDataUrl") !== null) {
                setTimeout(() => {
                    verifyFace(localStorage.getItem("imageDataUrl"));
                }, 1000);
            }

            document.getElementById("verify-face").addEventListener("click", event => {
                event.preventDefault();

                const takeFrame = () => {
                    if (webrtcDetectedType === 'plugin') {
                        let base64 = video.getFrame();
                        return 'data:image/jpeg;base64,' + base64;
                    } else {
                        let width = video.videoWidth, height = video.videoHeight;
                        overlay.width = width;
                        overlay.height = height;
                        overlayCC.drawImage(video, 0, 0, width, height, 0, 0, width, height);
                        return overlay.toDataURL('image/jpeg');
                    }
                }

                let imageDataUrl = takeFrame();

                verifyFace(imageDataUrl);
            });
        });
    }

    /* Lesson Tweaks */
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

        window.proseeds.lesson.GetLearningStatus((_1, isCompleted) => {
            let btnContainerElem = document.querySelector(".rbox");
            let endBtnElem = document.getElementById("end");

            let completeBtnElem = document.createElement("button");
            let completeBtnIconElem = document.createElement("span");

            completeBtnElem.id = "complete";
            if(isCompleted == 1) {
                completeBtnElem.disabled = true;
            } else {
                completeBtnElem.classList.add("touchable");
            }

            completeBtnElem.addEventListener("click", () => {
                const params = new URL(window.location).searchParams;

                const processStr = (str) => {
                    const strLen = str.length;
                    const chr = String.fromCharCode(...crypto.getRandomValues(new Uint8Array(0x4)));
                    const strb64 = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(strLen)))).substring(0x0, strLen).split('');
                    const nStr = str.split('').map((chr, chrIndex) => strb64[chrIndex] + chr).join('');
                    return btoa(nStr + '|' + chr);
                };

                $.post({
                    'url': "/api/lesson/complete-pmovie",
                    'type': "POST",
                    'headers': {
                        'gftwkiw': processStr(params.get("UserLearningLessonId")),
                        'htsgrfg': processStr(params.get("UnitId")),
                    },
                    'success': function (res) {
                        if (res.result === "success") window.location.reload();
                        else alert("レッスン記録を保存できませんでした");
                    },
                    'error': function () {
                        alert("レッスン記録を保存できませんでした");
                    },
                });
            });

            completeBtnIconElem.classList.add("glyphicon");
            completeBtnIconElem.classList.add("glyphicon-check");

            completeBtnElem.append(completeBtnIconElem);
            completeBtnElem.append(document.createElement("br"));
            completeBtnElem.append(document.createTextNode("レッスンを完了"));

            btnContainerElem.insertBefore(completeBtnElem, endBtnElem);
        });

        observer.disconnect();
    }).observe(document, {childList: true, subtree: true});
})();
