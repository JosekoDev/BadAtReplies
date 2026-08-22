(function () {
  "use strict";

  function isLandscape() {
    return window.matchMedia("(orientation: landscape)").matches;
  }

  function streamElement() {
    return (
      document.getElementById("videoCanvas") ||
      document.getElementById("videoStream") ||
      document.getElementById("stream")
    );
  }

  function streamContainer(el) {
    return el?.closest(".video-container") || document.getElementById("app");
  }

  function postSelkies(message) {
    window.postMessage(message, window.location.origin);
  }

  function applyLandscapeFit() {
    const landscape = isLandscape();
    document.documentElement.classList.toggle("selkies-landscape", landscape);

    if (landscape) {
      postSelkies({ type: "setScaleLocally", value: true });
    }

    const el = streamElement();
    const container = streamContainer(el);
    if (!el || !container) return;

    if (!landscape) {
      el.style.width = "";
      el.style.height = "";
      el.style.maxWidth = "";
      el.style.maxHeight = "";
      el.style.transform = "";
      el.style.left = "";
      el.style.top = "";
      el.style.position = "";
      return;
    }

    const fw =
      el.width ||
      el.videoWidth ||
      (el.naturalWidth > 0 ? el.naturalWidth : 0) ||
      500;
    const fh =
      el.height ||
      el.videoHeight ||
      (el.naturalHeight > 0 ? el.naturalHeight : 0) ||
      1086;
    const cw = container.clientWidth || window.innerWidth;
    const scale = cw / fw;

    el.style.position = "absolute";
    el.style.left = "50%";
    el.style.top = "50%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.width = `${Math.round(fw * scale)}px`;
    el.style.height = `${Math.round(fh * scale)}px`;
    el.style.maxWidth = "none";
    el.style.maxHeight = "none";
    if (el.tagName === "VIDEO") {
      el.style.objectFit = "cover";
    }
  }

  function onViewportChange() {
    applyLandscapeFit();
    requestAnimationFrame(applyLandscapeFit);
    setTimeout(applyLandscapeFit, 150);
  }

  window.addEventListener("resize", onViewportChange);
  window.addEventListener("orientationchange", onViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onViewportChange);
  }

  postSelkies({ type: "setScaleLocally", value: true });

  const poll = window.setInterval(() => {
    if (streamElement()) {
      window.clearInterval(poll);
      onViewportChange();
    }
  }, 200);
  window.setTimeout(() => window.clearInterval(poll), 60000);
})();
