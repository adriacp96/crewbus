/* ============================================================================
 * CrewBus - Modular App Logic + GTA VI (Vice City Launch Edition) Controller
 * Depende de: schedules.js (EGHQ_CONFIG, STOP_LOCATIONS, STOP_ALIASES, ROUTES)
 * ============================================================================ */

(() => {
    'use strict';

    // ------------------------------------------------------------------------
    // Storage Keys & Constants
    // ------------------------------------------------------------------------
    const STORAGE = {
        MODE: 'crewbus_mode',
        ROUTE: 'crewbus_route',
        STOP: 'crewbus_stop',
        DIRECTION: 'crewbus_direction',
        HOME: 'crewbus_home',
        GTA_MODE: 'crewbus_gta6_mode',
        GTA_FAB: 'crewbus_gta6_fab',
        SPLASH_DONE: 'crewbus_splash_dismissed'
    };

    const LAYOVER_DISTANCE_KM = 80;
    const EGATE_WINDOW_BEFORE_MIN = 35;

    const SPLASH_SLIDES = [
        { img: 'assets/crewrun.png', title: 'Never Miss Your Bus', text: 'Real-time departures & live countdowns right at your fingertips.' },
        { img: 'assets/crewtime.png', title: 'eGate Planner', text: 'Enter when your eGate opens and instantly see which bus gets you there on time.' },
        { img: 'assets/crewlost.png', title: 'Auto GPS Detection', text: 'Automatically detects whether you are at EGHQ or your accommodation.' },
        { img: 'assets/crewsleepy.png', title: 'Fullscreen Countdown', text: 'Giant glanceable clock for early morning pickups.' },
        { img: 'assets/crewhappy.png', title: 'Works Offline', text: 'Install to your Home Screen for instant access anywhere.' }
    ];

    const SCREENSAVER_THEMES = [
        { img: 'assets/crewsun.png', text: 'ENJOY YOUR LAYOVER!', gtaText: 'WELCOME TO VICE CITY!', fx: 'none' },
        { img: 'assets/crewdrink.png', text: 'TIME TO UNWIND!', gtaText: 'VICE NIGHTS!', fx: 'disco' },
        { img: 'assets/crewduck.png', text: 'BEACH MODE ON!', gtaText: 'VICE BEACH VIBES!', fx: 'waves' },
        { img: 'assets/crewexplorer.png', text: 'EXPLORE THE WORLD!', gtaText: 'LEONIDA KEYS!', fx: 'vines' },
        { img: 'assets/crewuntie.png', text: 'OFF DUTY RELAX!', gtaText: 'MISSION PASSED!', fx: 'none' }
    ];

    // ------------------------------------------------------------------------
    // DOM Cache
    // ------------------------------------------------------------------------
    const $ = (id) => document.getElementById(id);

    const DOM = {
        metaThemeColor: $('meta-theme-color'),
        // GTA Floating Pill
        fabWrapper: $('gta-fab-wrapper'),
        fabToggle: $('gta-fab-toggle'),
        fabHide: $('gta-fab-hide'),
        fabRestore: $('gta-fab-restore'),
        // Toast
        toast: $('location-toast'),
        toastText: $('location-toast-text'),
        // Splash
        splashScreen: $('splash-screen'),
        carouselTrack: $('carousel-track'),
        dismissSplash: $('dismiss-splash'),
        // Header
        headerRouteName: $('header-route-name'),
        headerAccommList: $('header-accommodation-list'),
        clockContainer: $('clock-container'),
        currentTimeDisplay: $('current-time-display'),
        // Controls
        btnModeAuto: $('btn-mode-auto'),
        btnModeManual: $('btn-mode-manual'),
        manualControls: $('manual-controls'),
        routeDropdown: $('route-dropdown'),
        stopSelector: $('stop-selector'),
        btnSaveHome: $('btn-save-home'),
        btnFromEghq: $('btn-from-eghq'),
        btnToEghq: $('btn-to-eghq'),
        // Next Bus Banner
        nextBusBanner: $('next-bus-banner'),
        bannerTitle: $('banner-title'),
        bannerDeparts: $('banner-departs'),
        bannerMinutes: $('banner-minutes'),
        bannerArrives: $('banner-arrives'),
        bannerArrivalLabel: $('banner-arrival-label'),
        bannerArrivalLabelDesk: $('banner-arrival-label-desk'),
        gtaWantedStars: $('gta-wanted-stars'),
        btnExpandFs: $('btn-expand-fs'),
        // Live Route Map
        routeMapTitle: $('route-map-title'),
        connectivityStatus: $('connectivity-status'),
        routeMapScroll: $('route-map-scroll'),
        routeMapContainer: $('route-map-container'),
        // Schedule
        scheduleHeading: $('schedule-heading'),
        btnEgatePlanner: $('btn-egate-planner'),
        btnCenterSchedule: $('btn-center-schedule'),
        egateActiveBanner: $('egate-active-banner'),
        egateWindowText: $('egate-window-text'),
        btnClearEgate: $('btn-clear-egate'),
        mobileLabelStart: $('mobile-label-start'),
        mobileLabelEnd: $('mobile-label-end'),
        desktopTableContainer: $('desktop-table-container'),
        desktopTheadTr: $('desktop-thead-tr'),
        desktopTbody: $('desktop-tbody'),
        mobileCardsContainer: $('mobile-cards-container'),
        // eGate Modal
        egateModal: $('egate-modal'),
        btnCloseEgate: $('btn-close-egate'),
        egateTimeInput: $('egate-time-input'),
        btnFindEgate: $('btn-find-egate'),
        // Fullscreen
        fsOverlay: $('fullscreen-overlay'),
        btnCloseFs: $('btn-close-fs'),
        fsGtaStars: $('fs-gta-stars'),
        fsTitle: $('fs-title'),
        fsDeparts: $('fs-departs'),
        fsCountdownBox: $('fs-countdown-box'),
        fsCountdown: $('fs-countdown'),
        fsArrivalLabel: $('fs-arrival-label'),
        fsArrives: $('fs-arrives'),
        // Screensaver
        screensaver: $('screensaver'),
        btnCloseScreensaver: $('btn-close-screensaver'),
        screensaverImg: $('screensaver-img'),
        screensaverSubtext: $('screensaver-subtext'),
        comicTextContainer: $('comic-text-container'),
        discoBallWrapper: $('disco-ball-wrapper'),
        wavesWrapper: $('waves-wrapper'),
        vinesWrapper: $('vines-wrapper')
    };

    // ------------------------------------------------------------------------
    // Pre-parsed Route Data (built once from schedules.js for max performance)
    // ------------------------------------------------------------------------
    const PARSED_ROUTES = {};

    function timeToMins(str) {
        if (!str || typeof str !== 'string' || !str.includes(':')) return null;
        const parts = str.trim().split(':');
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
    }

    function minsToTime(mins) {
        const norm = ((mins % 1440) + 1440) % 1440;
        const h = Math.floor(norm / 60);
        const m = norm % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function initParsedRoutes() {
        if (typeof ROUTES === 'undefined') return;
        Object.entries(ROUTES).forEach(([id, route]) => {
            const stops = route.stops || [];
            const uniqueAccommodations = [];
            const seen = new Set();

            stops.forEach((s, idx) => {
                const isEndpointEghq = (idx === 0 || idx === stops.length - 1) && s.toUpperCase() === 'EGHQ';
                if (isEndpointEghq) return;
                const key = s.toUpperCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueAccommodations.push(s);
                }
            });

            const parsedTrips = (route.trips || []).map((tripStr, tripIdx) => {
                const rawTimes = tripStr.split(',').map((t) => t.trim());
                const absMins = [];
                const modMins = [];
                let lastValid = null;

                for (let i = 0; i < stops.length; i++) {
                    const raw = rawTimes[i] || '';
                    const base = timeToMins(raw);
                    if (base === null) {
                        absMins.push(null);
                        modMins.push(null);
                    } else {
                        let val = base;
                        // Rollover across midnight (e.g. 23:50 -> 00:15)
                        if (lastValid !== null && val < lastValid - 360) {
                            val += 1440;
                        }
                        absMins.push(val);
                        modMins.push(base);
                        lastValid = Math.max(lastValid ?? -Infinity, val);
                    }
                }

                // Determine first and last valid stop indices for live vehicle tracking
                let firstIdx = -1;
                let lastIdx = -1;
                for (let i = 0; i < absMins.length; i++) {
                    if (absMins[i] !== null) {
                        if (firstIdx === -1) firstIdx = i;
                        lastIdx = i;
                    }
                }

                return {
                    index: tripIdx,
                    rawTimes,
                    absMins,
                    modMins,
                    firstIdx,
                    lastIdx,
                    startMin: firstIdx !== -1 ? absMins[firstIdx] : null,
                    endMin: lastIdx !== -1 ? absMins[lastIdx] : null
                };
            });

            PARSED_ROUTES[id] = {
                id,
                name: route.name,
                stops,
                uniqueAccommodations,
                trips: parsedTrips
            };
        });
    }

    // ------------------------------------------------------------------------
    // App State
    // ------------------------------------------------------------------------
    const state = {
        mode: localStorage.getItem(STORAGE.MODE) || 'auto',
        routeId: localStorage.getItem(STORAGE.ROUTE) || '5',
        stopName: localStorage.getItem(STORAGE.STOP) || '',
        direction: localStorage.getItem(STORAGE.DIRECTION) || 'from', // 'from' | 'to'
        egateMins: null,
        isFullscreen: false,
        isGtaMode: localStorage.getItem(STORAGE.GTA_MODE) === '1',
        lastNextTripIndex: -1,
        layoverShownThisSession: false,
        screensaverIndex: 0,
        toastTimer: null,
        clockTapCount: 0,
        clockTapTimer: null,
        vehiclesLayer: null
    };

    // Ensure valid route & stop
    function validateState() {
        const routeIds = Object.keys(PARSED_ROUTES);
        if (!routeIds.length) return;
        if (!PARSED_ROUTES[state.routeId]) {
            state.routeId = PARSED_ROUTES['5'] ? '5' : routeIds[0];
        }
        const route = PARSED_ROUTES[state.routeId];
        const match = route.uniqueAccommodations.find(
            (s) => s.toUpperCase() === (state.stopName || '').toUpperCase()
        );
        state.stopName = match || route.uniqueAccommodations[0] || route.stops[1] || '';
        if (state.direction !== 'from' && state.direction !== 'to') {
            state.direction = 'from';
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE.MODE, state.mode);
        localStorage.setItem(STORAGE.ROUTE, state.routeId);
        localStorage.setItem(STORAGE.STOP, state.stopName);
        localStorage.setItem(STORAGE.DIRECTION, state.direction);
    }

    // ------------------------------------------------------------------------
    // Stop Index Resolution (handles duplicate stops like Manazel Deira on 4B)
    // ------------------------------------------------------------------------
    function getStopIndices(route, stopName, direction) {
        const stopsUpper = route.stops.map((s) => s.toUpperCase());
        const target = (stopName || '').toUpperCase();

        if (direction === 'from') {
            const arriveIdx = stopsUpper.indexOf(target, 1);
            return {
                departIdx: 0,
                arriveIdx: arriveIdx !== -1 ? arriveIdx : Math.min(1, route.stops.length - 1)
            };
        } else {
            let departIdx = -1;
            for (let i = stopsUpper.length - 2; i >= 1; i--) {
                if (stopsUpper[i] === target) {
                    departIdx = i;
                    break;
                }
            }
            return {
                departIdx: departIdx !== -1 ? departIdx : Math.min(1, route.stops.length - 1),
                arriveIdx: route.stops.length - 1
            };
        }
    }

    // ------------------------------------------------------------------------
    // Toast Helper
    // ------------------------------------------------------------------------
    function showToast(message, duration = 3400) {
        if (!DOM.toast || !DOM.toastText) return;
        DOM.toastText.textContent = message;
        DOM.toast.classList.remove('-translate-y-8', 'opacity-0');
        DOM.toast.classList.add('translate-y-0', 'opacity-100');

        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => {
            DOM.toast.classList.remove('translate-y-0', 'opacity-100');
            DOM.toast.classList.add('-translate-y-8', 'opacity-0');
        }, duration);
    }

    // ------------------------------------------------------------------------
    // GTA VI Theme + Draggable / Hideable Floating Pill
    // ------------------------------------------------------------------------
    function updateMetaThemeColor() {
        if (!DOM.metaThemeColor) return;
        if (state.isGtaMode) {
            DOM.metaThemeColor.setAttribute('content', '#0c0417');
        } else {
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            DOM.metaThemeColor.setAttribute('content', isDark ? '#000000' : '#f5f5f7');
        }
    }

    function applyGtaMode(enabled, notify = false) {
        state.isGtaMode = Boolean(enabled);
        document.body.classList.toggle('gta6-mode', state.isGtaMode);
        localStorage.setItem(STORAGE.GTA_MODE, state.isGtaMode ? '1' : '0');
        updateMetaThemeColor();

        if (DOM.fabToggle) {
            DOM.fabToggle.setAttribute('aria-pressed', state.isGtaMode ? 'true' : 'false');
        }

        // Refresh UI labels, route map vehicle sprites, and schedule styles
        updateStaticLabels();
        renderRouteMapBase();
        renderSchedule(false);
        tick();

        if (notify) {
            showToast(
                state.isGtaMode
                    ? 'GTA VI Launch Edition • Welcome to Vice City'
                    : 'Classic CrewBus skin restored',
                2800
            );
        }
    }

    function loadFabPrefs() {
        try {
            const raw = localStorage.getItem(STORAGE.GTA_FAB);
            if (!raw) return { side: 'right', topPct: 78, hidden: false };
            const parsed = JSON.parse(raw);
            return {
                side: parsed.side === 'left' ? 'left' : 'right',
                topPct: typeof parsed.topPct === 'number' ? Math.min(88, Math.max(10, parsed.topPct)) : 78,
                hidden: Boolean(parsed.hidden)
            };
        } catch {
            return { side: 'right', topPct: 78, hidden: false };
        }
    }

    function saveFabPrefs(prefs) {
        try {
            localStorage.setItem(STORAGE.GTA_FAB, JSON.stringify(prefs));
        } catch { /* ignore storage quota errors */ }
    }

    function initGtaFloatingButton() {
        const wrapper = DOM.fabWrapper;
        if (!wrapper) return;

        let prefs = loadFabPrefs();

        const applyFabVisuals = () => {
            wrapper.classList.toggle('snap-left', prefs.side === 'left');
            wrapper.classList.toggle('snap-right', prefs.side !== 'left');
            wrapper.classList.toggle('is-hidden', prefs.hidden);
            wrapper.style.left = '';
            wrapper.style.right = '';
            wrapper.style.top = `${prefs.topPct}%`;
        };

        applyFabVisuals();

        // Hide to edge tab
        if (DOM.fabHide) {
            DOM.fabHide.addEventListener('click', (e) => {
                e.stopPropagation();
                prefs.hidden = true;
                applyFabVisuals();
                saveFabPrefs(prefs);
            });
        }

        // Restore from edge tab
        let restoreDragged = false;
        if (DOM.fabRestore) {
            DOM.fabRestore.addEventListener('click', () => {
                if (restoreDragged) {
                    restoreDragged = false;
                    return;
                }
                prefs.hidden = false;
                applyFabVisuals();
                saveFabPrefs(prefs);
            });
        }

        // Dragging logic for both the pill and the docked edge tab
        let isDragging = false;
        let hasMoved = false;
        let startX = 0;
        let startY = 0;
        let originLeft = 0;
        let originTop = 0;
        let suppressNextToggleClick = false;

        const onPointerDown = (e) => {
            // Don't start drag from the small hide button
            if (e.target.closest('#gta-fab-hide')) return;
            if (e.button !== undefined && e.button !== 0) return;

            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = wrapper.getBoundingClientRect();
            originLeft = rect.left;
            originTop = rect.top;

            try {
                wrapper.setPointerCapture(e.pointerId);
            } catch { /* ignore */ }
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (!hasMoved && Math.hypot(dx, dy) > 6) {
                hasMoved = true;
                wrapper.classList.add('dragging');
            }

            if (!hasMoved) return;

            const rect = wrapper.getBoundingClientRect();
            const minTop = 52;
            const maxTop = window.innerHeight - rect.height - 24;
            const newTop = Math.min(maxTop, Math.max(minTop, originTop + dy));

            wrapper.style.top = `${newTop}px`;

            if (!prefs.hidden) {
                const minLeft = 8;
                const maxLeft = window.innerWidth - rect.width - 8;
                const newLeft = Math.min(maxLeft, Math.max(minLeft, originLeft + dx));
                wrapper.style.left = `${newLeft}px`;
                wrapper.style.right = 'auto';
            }
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            try {
                wrapper.releasePointerCapture(e.pointerId);
            } catch { /* ignore */ }

            if (hasMoved) {
                wrapper.classList.remove('dragging');
                const rect = wrapper.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                if (!prefs.hidden) {
                    prefs.side = centerX < window.innerWidth / 2 ? 'left' : 'right';
                } else {
                    restoreDragged = true;
                }
                prefs.topPct = Math.round(
                    Math.min(88, Math.max(10, (rect.top / window.innerHeight) * 100))
                );
                applyFabVisuals();
                saveFabPrefs(prefs);
                suppressNextToggleClick = true;
                setTimeout(() => { suppressNextToggleClick = false; }, 120);
            }
        };

        wrapper.addEventListener('pointerdown', onPointerDown);
        wrapper.addEventListener('pointermove', onPointerMove);
        wrapper.addEventListener('pointerup', onPointerUp);
        wrapper.addEventListener('pointercancel', onPointerUp);

        if (DOM.fabToggle) {
            DOM.fabToggle.addEventListener('click', () => {
                if (suppressNextToggleClick) return;
                applyGtaMode(!state.isGtaMode, true);
            });
        }
    }

    // ------------------------------------------------------------------------
    // Wanted Level Stars (GTA VI HUD)
    // ------------------------------------------------------------------------
    const STAR_SVG = `<svg class="gta-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 17.3l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9L12 2.4z"/></svg>`;

    function initWantedStars() {
        const html = STAR_SVG.repeat(5);
        if (DOM.gtaWantedStars) DOM.gtaWantedStars.innerHTML = html;
        if (DOM.fsGtaStars) DOM.fsGtaStars.innerHTML = html;
    }

    function updateWantedStars(diffSec) {
        if (!state.isGtaMode) return;
        const minsLeft = diffSec / 60;
        let activeCount = 1;
        if (minsLeft <= 3) activeCount = 5;
        else if (minsLeft <= 6) activeCount = 4;
        else if (minsLeft <= 12) activeCount = 3;
        else if (minsLeft <= 20) activeCount = 2;

        const isChase = minsLeft <= 3;

        [DOM.gtaWantedStars, DOM.fsGtaStars].forEach((container) => {
            if (!container) return;
            container.classList.toggle('wanted-chase', isChase);
            const stars = container.querySelectorAll('.gta-star');
            stars.forEach((star, idx) => {
                star.classList.toggle('active', idx < activeCount);
                star.classList.toggle('dim', idx >= activeCount);
            });
        });
    }

    // ------------------------------------------------------------------------
    // Controls & Dropdowns
    // ------------------------------------------------------------------------
    const TAB_BASE = 'flex-1 py-1.5 text-xs duo:text-sm rounded-lg transition-all whitespace-nowrap text-center';
    const MODE_TAB_BASE = 'flex-1 py-1.5 duo:py-2 text-xs duo:text-sm rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5';
    const TAB_ACTIVE = 'font-semibold bg-white dark:bg-neutral-800 shadow-sm dark:shadow-none text-neutral-900 dark:text-white gta-tab-active';
    const TAB_INACTIVE = 'font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white gta-tab-inactive';

    function populateRouteDropdown() {
        if (!DOM.routeDropdown) return;
        DOM.routeDropdown.innerHTML = '';
        Object.values(PARSED_ROUTES).forEach((route) => {
            const opt = document.createElement('option');
            opt.value = route.id;
            opt.textContent = route.name;
            DOM.routeDropdown.appendChild(opt);
        });
        DOM.routeDropdown.value = state.routeId;
    }

    function populateStopSelector() {
        const route = PARSED_ROUTES[state.routeId];
        if (!route || !DOM.stopSelector) return;

        DOM.stopSelector.innerHTML = '';
        route.uniqueAccommodations.forEach((stop) => {
            const opt = document.createElement('option');
            opt.value = stop;
            opt.textContent = stop;
            DOM.stopSelector.appendChild(opt);
        });

        if (!route.uniqueAccommodations.includes(state.stopName)) {
            state.stopName = route.uniqueAccommodations[0] || '';
        }
        DOM.stopSelector.value = state.stopName;
    }

    function updateControlButtonsUI() {
        const isAuto = state.mode === 'auto';
        if (DOM.btnModeAuto) DOM.btnModeAuto.className = `${MODE_TAB_BASE} ${isAuto ? TAB_ACTIVE : TAB_INACTIVE}`;
        if (DOM.btnModeManual) DOM.btnModeManual.className = `${MODE_TAB_BASE} ${!isAuto ? TAB_ACTIVE : TAB_INACTIVE}`;
        if (DOM.manualControls) DOM.manualControls.classList.toggle('hidden', isAuto);

        const isFrom = state.direction === 'from';
        if (DOM.btnFromEghq) DOM.btnFromEghq.className = `${TAB_BASE} ${isFrom ? TAB_ACTIVE : TAB_INACTIVE}`;
        if (DOM.btnToEghq) DOM.btnToEghq.className = `${TAB_BASE} ${!isFrom ? TAB_ACTIVE : TAB_INACTIVE}`;
    }

    function updateStaticLabels() {
        const route = PARSED_ROUTES[state.routeId];
        if (!route) return;

        if (DOM.headerRouteName) {
            DOM.headerRouteName.textContent = route.name;
        }
        if (DOM.headerAccommList) {
            DOM.headerAccommList.textContent = route.uniqueAccommodations.join(' • ');
        }

        const isFrom = state.direction === 'from';
        const destLabel = isFrom ? state.stopName : 'EGHQ';

        if (state.isGtaMode) {
            if (DOM.routeMapTitle) DOM.routeMapTitle.textContent = 'Leonida GPS • Live';
            if (DOM.scheduleHeading) DOM.scheduleHeading.textContent = 'Vice Dispatch';
            if (DOM.bannerTitle) DOM.bannerTitle.textContent = isFrom ? `Next Ride • From EGHQ` : `Next Getaway • ${state.stopName}`;
            if (DOM.fsTitle) DOM.fsTitle.textContent = isFrom ? `VICE RUN • TO ${destLabel}` : `MISSION • TO EGHQ`;
            if (DOM.bannerArrivalLabel) DOM.bannerArrivalLabel.textContent = `ETA ${destLabel}`;
            if (DOM.bannerArrivalLabelDesk) DOM.bannerArrivalLabelDesk.textContent = `ETA • ${destLabel}`;
            if (DOM.fsArrivalLabel) DOM.fsArrivalLabel.textContent = `ETA ${destLabel}`;
        } else {
            if (DOM.routeMapTitle) DOM.routeMapTitle.textContent = 'Live Route';
            if (DOM.scheduleHeading) DOM.scheduleHeading.textContent = 'Bus Schedule';
            if (DOM.bannerTitle) DOM.bannerTitle.textContent = isFrom ? `Next Bus • From EGHQ` : `Next Bus • From ${state.stopName}`;
            if (DOM.fsTitle) DOM.fsTitle.textContent = isFrom ? `From EGHQ to ${destLabel}` : `From ${state.stopName} to EGHQ`;
            if (DOM.bannerArrivalLabel) DOM.bannerArrivalLabel.textContent = `Arr ${destLabel}`;
            if (DOM.bannerArrivalLabelDesk) DOM.bannerArrivalLabelDesk.textContent = `Expected ${destLabel}`;
            if (DOM.fsArrivalLabel) DOM.fsArrivalLabel.textContent = `Expected ${destLabel}`;
        }

        if (DOM.mobileLabelStart) {
            DOM.mobileLabelStart.textContent = isFrom ? 'Dep. EGHQ' : `Dep. ${state.stopName}`;
        }
        if (DOM.mobileLabelEnd) {
            DOM.mobileLabelEnd.textContent = isFrom ? `Arr. ${state.stopName}` : 'Arr. EGHQ';
        }
    }

    // ------------------------------------------------------------------------
    // Live Route Map (Bus in Classic Mode / Vice City Sports Car in GTA VI Mode)
    // ------------------------------------------------------------------------
    function createSportsCarSVG(idx) {
        const gradId = `viceCarGrad_${idx}`;
        return `
            <div class="vice-car-wrap">
                <span class="vice-car-trail"></span>
                <span class="vice-car-underglow"></span>
                <svg class="w-9 h-5 drop-shadow-[0_2px_6px_rgba(255,46,147,0.85)]" viewBox="0 0 46 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 9.5L1.6 6.8H7.2" stroke="#ffd166" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M4 14.5L6.5 9.8C7.8 8.2 10.2 7.6 13.5 7.4L19.5 4.2C22.4 3.2 26.8 3.2 30 4.4L35.2 7.5C39.2 8 42.6 9.3 43.8 11.4L44.2 14.2C44.2 15.2 43.4 15.8 42.2 15.8H5.5C4.4 15.8 3.6 15.2 4 14.5Z" fill="url(#${gradId})" stroke="#ffffff" stroke-width="1.15" stroke-linejoin="round"/>
                    <path d="M16.2 7.4L20.4 5.1C23.2 4.6 26.8 4.8 29.8 5.7L32.8 7.5H16.2Z" fill="#00f5d4" fill-opacity="0.75"/>
                    <path d="M13 11.8H32" stroke="#ffd166" stroke-width="1.15" stroke-linecap="round" stroke-opacity="0.9"/>
                    <circle cx="42.4" cy="11.8" r="1.5" fill="#00f5d4"/>
                    <rect x="4.3" y="11" width="2.2" height="1.6" rx="0.8" fill="#ff2e93"/>
                    <circle cx="12.5" cy="15.8" r="3.1" fill="#0c0417" stroke="#00f5d4" stroke-width="1.6"/>
                    <circle cx="12.5" cy="15.8" r="0.95" fill="#ffd166"/>
                    <circle cx="34.5" cy="15.8" r="3.1" fill="#0c0417" stroke="#00f5d4" stroke-width="1.6"/>
                    <circle cx="34.5" cy="15.8" r="0.95" fill="#ffd166"/>
                    <defs>
                        <linearGradient id="${gradId}" x1="4" y1="4" x2="44" y2="16" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#ff2e93"/>
                            <stop offset="0.55" stop-color="#ff7b54"/>
                            <stop offset="1" stop-color="#ffd166"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        `;
    }

    function createClassicBusSVG() {
        return `
            <div class="w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white shadow-md ring-2 ring-white dark:ring-neutral-950 flex items-center justify-center">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6 2 7"/><path d="M10 6h4"/><path d="m22 7-2-1"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/></svg>
            </div>
        `;
    }

    function renderRouteMapBase() {
        const route = PARSED_ROUTES[state.routeId];
        if (!route || !DOM.routeMapContainer) return;

        const stops = route.stops;
        const { departIdx, arriveIdx } = getStopIndices(route, state.stopName, state.direction);
        const minWidthPx = Math.max(300, stops.length * 64);

        DOM.routeMapContainer.innerHTML = '';
        DOM.routeMapContainer.className = 'relative flex items-start justify-between w-full';
        DOM.routeMapContainer.style.minWidth = `${minWidthPx}px`;

        // Base track line (center of first 44px node to center of last 44px node)
        const track = document.createElement('div');
        track.className = 'gta-track-line absolute left-[22px] right-[22px] top-[9px] h-[2px] bg-neutral-200 dark:bg-neutral-800 rounded-full z-0';
        DOM.routeMapContainer.appendChild(track);

        // Active segment highlight between departIdx and arriveIdx
        if (stops.length > 1) {
            const startPct = (departIdx / (stops.length - 1)) * 100;
            const endPct = (arriveIdx / (stops.length - 1)) * 100;
            const segTrack = document.createElement('div');
            segTrack.className = 'absolute left-[22px] right-[22px] top-[8px] h-[4px] z-[1] pointer-events-none';
            const segFill = document.createElement('div');
            segFill.style.left = `${Math.min(startPct, endPct)}%`;
            segFill.style.width = `${Math.abs(endPct - startPct)}%`;
            segFill.className = state.isGtaMode
                ? 'absolute top-0 h-full rounded-full bg-gradient-to-r from-[#ff2e93] via-[#ffd166] to-[#00f5d4] shadow-[0_0_10px_rgba(0,245,212,0.6)]'
                : 'absolute top-0 h-full rounded-full bg-indigo-500/80 dark:bg-indigo-400/80';
            segTrack.appendChild(segFill);
            DOM.routeMapContainer.appendChild(segTrack);
        }

        // Vehicles overlay layer
        const vehiclesLayer = document.createElement('div');
        vehiclesLayer.id = 'route-vehicles-layer';
        vehiclesLayer.className = 'absolute left-[22px] right-[22px] top-[10px] h-0 z-20 pointer-events-none';
        DOM.routeMapContainer.appendChild(vehiclesLayer);
        state.vehiclesLayer = vehiclesLayer;

        // Stop Nodes
        stops.forEach((stop, idx) => {
            const isDepart = idx === departIdx;
            const isArrive = idx === arriveIdx;
            const isSelected = isDepart || isArrive;
            const isEndpoint = idx === 0 || idx === stops.length - 1;

            const node = document.createElement('button');
            node.type = 'button';
            node.className = 'relative z-10 flex flex-col items-center w-[44px] shrink-0 group focus:outline-none cursor-pointer';
            node.title = stop;

            let dotClass = 'w-3 h-3 mt-[4px] rounded-full border-2 transition-transform group-hover:scale-125 ';
            if (state.isGtaMode) {
                if (isDepart) dotClass += 'bg-[#ff2e93] border-[#ffd166] shadow-[0_0_10px_#ff2e93] scale-125';
                else if (isArrive) dotClass += 'bg-[#00f5d4] border-white shadow-[0_0_10px_#00f5d4] scale-125';
                else dotClass += 'bg-[#1a0830] border-[#ff2e93]/60';
            } else {
                if (isDepart) dotClass += 'bg-indigo-600 border-white dark:border-neutral-950 ring-2 ring-indigo-500/40 scale-125';
                else if (isArrive) dotClass += 'bg-emerald-500 border-white dark:border-neutral-950 ring-2 ring-emerald-500/40 scale-125';
                else dotClass += 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600';
            }

            let labelClass = 'absolute top-[22px] text-[9px] duo:text-[10px] font-bold uppercase tracking-tight whitespace-nowrap ';
            if (idx === 0) labelClass += 'left-0 text-left ';
            else if (idx === stops.length - 1) labelClass += 'right-0 text-right ';
            else labelClass += 'left-1/2 -translate-x-1/2 text-center ';

            if (state.isGtaMode) {
                labelClass += isSelected ? 'text-[#ffd166]' : 'text-fuchsia-200/60';
            } else {
                labelClass += isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500';
            }

            node.innerHTML = `<span class="${dotClass}"></span><span class="${labelClass}">${stop}</span>`;

            // Tap a stop on the live map to quickly select it
            if (!isEndpoint) {
                node.addEventListener('click', () => {
                    if (state.stopName.toUpperCase() !== stop.toUpperCase()) {
                        state.stopName = stop;
                        if (DOM.stopSelector) DOM.stopSelector.value = stop;
                        saveState();
                        onSelectionChanged(true);
                    }
                });
            }

            DOM.routeMapContainer.appendChild(node);
        });
    }

    function updateLiveVehicles(nowMinsFloat) {
        const route = PARSED_ROUTES[state.routeId];
        if (!route || !state.vehiclesLayer) return;

        const stopCount = route.stops.length;
        if (stopCount < 2) return;

        const activeVehicles = [];
        // Check yesterday (-1440) and today (0) to catch midnight-crossing trips
        const offsets = [-1440, 0];

        route.trips.forEach((trip) => {
            if (trip.startMin === null || trip.endMin === null) return;

            for (const offset of offsets) {
                const start = trip.startMin + offset;
                const end = trip.endMin + offset;

                if (nowMinsFloat >= start && nowMinsFloat <= end) {
                    // Find current active segment between valid stops
                    let prevIdx = trip.firstIdx;
                    let prevMin = trip.absMins[prevIdx] + offset;

                    for (let i = trip.firstIdx + 1; i <= trip.lastIdx; i++) {
                        if (trip.absMins[i] === null) continue;
                        const currMin = trip.absMins[i] + offset;

                        if (nowMinsFloat >= prevMin && nowMinsFloat <= currMin) {
                            const segDur = Math.max(0.001, currMin - prevMin);
                            const frac = Math.min(1, Math.max(0, (nowMinsFloat - prevMin) / segDur));
                            const stopPos = prevIdx + frac * (i - prevIdx);
                            const pct = (stopPos / (stopCount - 1)) * 100;
                            activeVehicles.push({
                                pct,
                                nextStop: route.stops[i],
                                eta: trip.rawTimes[i]
                            });
                            break;
                        }
                        if (currMin > prevMin) {
                            prevIdx = i;
                            prevMin = currMin;
                        }
                    }
                }
            }
        });

        let html = '';
        activeVehicles.forEach((v, idx) => {
            const sprite = state.isGtaMode ? createSportsCarSVG(idx) : createClassicBusSVG();
            html += `
                <div class="absolute top-0 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-linear"
                     style="left: ${v.pct.toFixed(2)}%;"
                     title="Next: ${v.nextStop} (${v.eta})">
                    ${sprite}
                </div>
            `;
        });

        state.vehiclesLayer.innerHTML = html;
    }

    // ------------------------------------------------------------------------
    // Next Bus Computation & eGate Matching
    // ------------------------------------------------------------------------
    function getNextTripInfo(nowSec) {
        const route = PARSED_ROUTES[state.routeId];
        if (!route) return null;

        const { departIdx, arriveIdx } = getStopIndices(route, state.stopName, state.direction);
        let best = null;

        route.trips.forEach((trip) => {
            const depMod = trip.modMins[departIdx];
            const arrMod = trip.modMins[arriveIdx];
            if (depMod === null || arrMod === null) return;

            const diffSec = ((depMod * 60 - nowSec) % 86400 + 86400) % 86400;
            if (!best || diffSec < best.diffSec) {
                best = {
                    trip,
                    tripIndex: trip.index,
                    departStr: trip.rawTimes[departIdx],
                    arriveStr: trip.rawTimes[arriveIdx],
                    departMod: depMod,
                    arriveMod: arrMod,
                    diffSec
                };
            }
        });

        return best;
    }

    function isTripInEgateWindow(trip, arriveIdx) {
        if (state.egateMins === null) return false;
        const arrMod = trip.modMins[arriveIdx];
        if (arrMod === null) return false;

        // Distance before eGate time (handles midnight wrap cleanly)
        const minsBefore = ((state.egateMins - arrMod) % 1440 + 1440) % 1440;
        return minsBefore >= 0 && minsBefore <= EGATE_WINDOW_BEFORE_MIN;
    }

    // ------------------------------------------------------------------------
    // Schedule Rendering (Desktop Table & Mobile Cards)
    // ------------------------------------------------------------------------
    function renderSchedule(shouldAutoScroll = false) {
        const route = PARSED_ROUTES[state.routeId];
        if (!route) return;

        const now = new Date();
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const nextInfo = getNextTripInfo(nowSec);
        const nextIdx = nextInfo ? nextInfo.tripIndex : -1;
        state.lastNextTripIndex = nextIdx;

        const { departIdx, arriveIdx } = getStopIndices(route, state.stopName, state.direction);
        const hasEgate = state.egateMins !== null;

        // 1. Desktop Table Header
        if (DOM.desktopTheadTr) {
            DOM.desktopTheadTr.innerHTML = route.stops.map((stop, idx) => {
                const isDep = idx === departIdx;
                const isArr = idx === arriveIdx;
                const highlight = isDep
                    ? (state.isGtaMode ? 'text-[#ff2e93]' : 'text-indigo-600 dark:text-indigo-400')
                    : isArr
                        ? (state.isGtaMode ? 'text-[#00f5d4]' : 'text-emerald-600 dark:text-emerald-400')
                        : '';
                return `<th class="px-4 py-3 font-bold ${highlight}">${stop}</th>`;
            }).join('');
        }

        // 2. Desktop Table Rows & Mobile Cards
        let desktopHtml = '';
        let mobileHtml = '';
        let firstEgateFound = false;

        route.trips.forEach((trip) => {
            const depMod = trip.modMins[departIdx];
            const arrMod = trip.modMins[arriveIdx];
            const isServiced = depMod !== null && arrMod !== null;
            const isNext = trip.index === nextIdx;
            const isEgateMatch = isServiced && hasEgate && isTripInEgateWindow(trip, arriveIdx);

            let isPast = false;
            if (isServiced && !isNext) {
                const diffSec = ((depMod * 60 - nowSec) % 86400 + 86400) % 86400;
                isPast = depMod * 60 < nowSec && diffSec > 3600;
            }

            let scrollIdDesk = '';
            let scrollIdMob = '';
            if (isEgateMatch && !firstEgateFound) {
                scrollIdDesk = 'id="desk-scroll-egate"';
                scrollIdMob = 'id="mob-scroll-egate"';
                firstEgateFound = true;
            } else if (isNext) {
                scrollIdDesk = 'id="desk-scroll-next"';
                scrollIdMob = 'id="mob-scroll-next"';
            }

            // Desktop Row
            let trClass = 'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60 ';
            if (isNext) {
                trClass += 'bg-indigo-50/90 dark:bg-indigo-950/50 font-bold gta-next-row ';
            } else if (isEgateMatch) {
                trClass += 'bg-violet-50/80 dark:bg-violet-950/40 font-semibold gta-egate-row ';
            } else if (isPast) {
                trClass += 'opacity-40 ';
            }

            const cells = route.stops.map((_, idx) => {
                const raw = trip.rawTimes[idx] || '—';
                const isDep = idx === departIdx;
                const isArr = idx === arriveIdx;
                let tdClass = 'px-4 py-2.5 ';
                if (isNext && isDep) tdClass += 'text-indigo-600 dark:text-indigo-400 font-extrabold gta-next-text ';
                else if (isDep) tdClass += 'font-semibold text-neutral-900 dark:text-white ';
                else if (isArr) tdClass += 'font-semibold text-neutral-700 dark:text-neutral-200 ';
                else tdClass += 'text-neutral-500 dark:text-neutral-400 ';

                let badge = '';
                if (isDep && isNext) {
                    badge = state.isGtaMode
                        ? `<span class="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-[#ff2e93] to-[#ff7b54] text-white uppercase tracking-wider font-black">NEXT</span>`
                        : `<span class="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider font-bold">NEXT</span>`;
                } else if (isArr && isEgateMatch) {
                    badge = `<span class="gta-egate-pill ml-2 text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider font-bold">eGate</span>`;
                }

                return `<td class="${tdClass}">${raw}${badge}</td>`;
            }).join('');

            desktopHtml += `<tr ${scrollIdDesk} class="${trClass}">${cells}</tr>`;

            // Mobile Card (only trips servicing the selected stop)
            if (isServiced) {
                let cardClass = 'flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/70 transition-colors ';
                if (isNext) {
                    cardClass += 'bg-indigo-50/90 dark:bg-indigo-950/50 gta-next-row ';
                } else if (isEgateMatch) {
                    cardClass += 'bg-violet-50/80 dark:bg-violet-950/40 gta-egate-row ';
                } else if (isPast) {
                    cardClass += 'opacity-40 ';
                }

                const depTextClass = isNext
                    ? 'text-lg font-extrabold text-indigo-600 dark:text-indigo-400 gta-next-text'
                    : 'text-base font-bold text-neutral-900 dark:text-white';

                const arrTextClass = isNext
                    ? 'text-base font-bold text-neutral-900 dark:text-white'
                    : 'text-sm font-semibold text-neutral-600 dark:text-neutral-300';

                let pills = '';
                if (isNext) {
                    pills += state.isGtaMode
                        ? `<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#ff2e93] to-[#ff7b54] text-white font-black uppercase tracking-wider">Next</span>`
                        : `<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-bold uppercase tracking-wider">Next</span>`;
                }
                if (isEgateMatch) {
                    pills += `<span class="gta-egate-pill text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-bold uppercase tracking-wider">eGate</span>`;
                }

                // Compute trip duration for mobile sub-label
                const durMins = ((arrMod - depMod) % 1440 + 1440) % 1440;

                mobileHtml += `
                    <div ${scrollIdMob} class="${cardClass}">
                        <div class="flex items-center gap-2">
                            <p class="${depTextClass}">${trip.rawTimes[departIdx]}</p>
                            ${pills}
                        </div>
                        <div class="flex items-center gap-2 text-right">
                            <span class="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">${durMins}m</span>
                            <p class="${arrTextClass}">${trip.rawTimes[arriveIdx]}</p>
                        </div>
                    </div>
                `;
            }
        });

        if (DOM.desktopTbody) DOM.desktopTbody.innerHTML = desktopHtml;
        if (DOM.mobileCardsContainer) DOM.mobileCardsContainer.innerHTML = mobileHtml;

        if (shouldAutoScroll) {
            requestAnimationFrame(() => centerScheduleScroll());
        }
    }

    function centerScheduleScroll() {
        const deskTarget = $('desk-scroll-egate') || $('desk-scroll-next');
        if (deskTarget && DOM.desktopTableContainer) {
            const container = DOM.desktopTableContainer;
            const top = deskTarget.offsetTop - container.clientHeight / 2 + deskTarget.clientHeight / 2;
            container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }

        const mobTarget = $('mob-scroll-egate') || $('mob-scroll-next');
        if (mobTarget && DOM.mobileCardsContainer) {
            const container = DOM.mobileCardsContainer;
            const top = mobTarget.offsetTop - container.clientHeight / 2 + mobTarget.clientHeight / 2;
            container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
    }

    // ------------------------------------------------------------------------
    // 1-Second Live Tick (Clock, Countdown, Fullscreen, Wanted Stars, Live Map)
    // ------------------------------------------------------------------------
    function formatBannerCountdown(diffSec) {
        if (diffSec <= 0) return state.isGtaMode ? 'GO NOW!' : 'Departing';
        const hrs = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        const secs = diffSec % 60;
        if (hrs > 0) return `in ${hrs}h ${mins}m`;
        if (mins === 0) return `in ${secs}s`;
        return `in ${mins}m ${String(secs).padStart(2, '0')}s`;
    }

    function formatFsCountdown(diffSec) {
        const hrs = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        const secs = diffSec % 60;
        if (hrs > 0) {
            return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateFullscreenUrgency(diffSec) {
        if (!DOM.fsCountdownBox || !DOM.fsCountdown) return;
        const minsLeft = diffSec / 60;

        const baseBox = 'flex flex-col items-center justify-center px-6 py-5 sm:p-10 rounded-3xl border w-full max-w-lg mx-auto transition-all duration-500 shadow-lg ';
        const baseText = 'font-bold font-mono tracking-tight tabular-nums leading-none ';

        if (minsLeft < 5) {
            DOM.fsCountdownBox.className = `${baseBox} bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700/60 gta-fs-urgent`;
            DOM.fsCountdown.className = `${baseText} text-red-600 dark:text-red-400`;
        } else if (minsLeft < 10) {
            DOM.fsCountdownBox.className = `${baseBox} bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700/60 gta-fs-warn`;
            DOM.fsCountdown.className = `${baseText} text-amber-600 dark:text-amber-400`;
        } else {
            DOM.fsCountdownBox.className = `${baseBox} bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-white/10 gta-fs-normal`;
            DOM.fsCountdown.className = `${baseText} text-neutral-900 dark:text-white`;
        }
    }

    function tick() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = now.getSeconds();
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + ss;
        const nowMinsFloat = nowSec / 60;

        if (DOM.currentTimeDisplay) {
            DOM.currentTimeDisplay.textContent = `${hh}:${mm}`;
        }

        const nextInfo = getNextTripInfo(nowSec);
        if (nextInfo) {
            if (DOM.nextBusBanner) {
                DOM.nextBusBanner.classList.remove('hidden');
                DOM.nextBusBanner.classList.add('flex');
            }
            if (DOM.bannerDeparts) DOM.bannerDeparts.textContent = nextInfo.departStr;
            if (DOM.bannerMinutes) DOM.bannerMinutes.textContent = formatBannerCountdown(nextInfo.diffSec);
            if (DOM.bannerArrives) DOM.bannerArrives.textContent = nextInfo.arriveStr;

            // Update Fullscreen view
            if (DOM.fsDeparts) DOM.fsDeparts.textContent = nextInfo.departStr;
            if (DOM.fsCountdown) DOM.fsCountdown.textContent = formatFsCountdown(nextInfo.diffSec);
            if (DOM.fsArrives) DOM.fsArrives.textContent = nextInfo.arriveStr;
            updateFullscreenUrgency(nextInfo.diffSec);

            // Update GTA VI Wanted Level Stars
            updateWantedStars(nextInfo.diffSec);

            // Re-render schedule only when the next departure rolls over
            if (nextInfo.tripIndex !== state.lastNextTripIndex) {
                renderSchedule(false);
            }
        }

        // Update Live Route Map vehicles (buses or Vice City sports cars)
        updateLiveVehicles(nowMinsFloat);
    }

    // ------------------------------------------------------------------------
    // GPS Auto-Location & Custom Home
    // ------------------------------------------------------------------------
    function getDistanceKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLng = (lng2 - lng1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function findRouteByStopName(rawName) {
        const aliased = (typeof STOP_ALIASES !== 'undefined' && STOP_ALIASES[rawName]) || rawName;
        const target = aliased.toUpperCase().trim();

        for (const route of Object.values(PARSED_ROUTES)) {
            const match = route.uniqueAccommodations.find((s) => s.toUpperCase().trim() === target);
            if (match) {
                return { routeId: route.id, stopName: match };
            }
        }
        return null;
    }

    function getSavedHome() {
        try {
            const raw = localStorage.getItem(STORAGE.HOME);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function runAutoLocation(silentIfManual = false) {
        if (silentIfManual && state.mode !== 'auto') return;
        if (!navigator.geolocation || typeof EGHQ_CONFIG === 'undefined') return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                const distEghq = getDistanceKm(lat, lng, EGHQ_CONFIG.lat, EGHQ_CONFIG.lng);

                // Outside Dubai -> Layover Screensaver
                if (distEghq > LAYOVER_DISTANCE_KM) {
                    if (!state.layoverShownThisSession) {
                        state.layoverShownThisSession = true;
                        openScreensaver(true);
                    }
                    return;
                }

                if (state.mode !== 'auto') return;

                // 1. Check if at EGHQ
                if (distEghq <= EGHQ_CONFIG.eghqRadiusKm) {
                    const home = getSavedHome();
                    if (home && PARSED_ROUTES[home.routeId]) {
                        state.routeId = home.routeId;
                        state.stopName = home.stopName;
                    }
                    state.direction = 'from';
                    validateState();
                    saveState();
                    populateRouteDropdown();
                    populateStopSelector();
                    onSelectionChanged(true);
                    showToast(`At EGHQ • Buses to ${state.stopName}`);
                    return;
                }

                // 2. Check Saved Custom Home GPS first
                const home = getSavedHome();
                if (home && home.lat && home.lng && PARSED_ROUTES[home.routeId]) {
                    const distHome = getDistanceKm(lat, lng, home.lat, home.lng);
                    if (distHome <= EGHQ_CONFIG.accommodationRadiusKm) {
                        state.routeId = home.routeId;
                        state.stopName = home.stopName;
                        state.direction = 'to';
                        validateState();
                        saveState();
                        populateRouteDropdown();
                        populateStopSelector();
                        onSelectionChanged(true);
                        showToast(`Home detected: ${state.stopName} • To EGHQ`);
                        return;
                    }
                }

                // 3. Find closest known accommodation
                if (typeof STOP_LOCATIONS !== 'undefined') {
                    let closest = null;
                    Object.entries(STOP_LOCATIONS).forEach(([locName, coords]) => {
                        if (!coords || (coords.lat === 0 && coords.lng === 0)) return;
                        const dist = getDistanceKm(lat, lng, coords.lat, coords.lng);
                        if (!closest || dist < closest.dist) {
                            closest = { locName, dist };
                        }
                    });

                    if (closest && closest.dist <= EGHQ_CONFIG.accommodationRadiusKm) {
                        const found = findRouteByStopName(closest.locName);
                        if (found) {
                            state.routeId = found.routeId;
                            state.stopName = found.stopName;
                            state.direction = 'to';
                            saveState();
                            populateRouteDropdown();
                            populateStopSelector();
                            onSelectionChanged(true);
                            showToast(`Detected: ${found.stopName} • To EGHQ`);
                        }
                    }
                }
            },
            () => { /* GPS permission denied or unavailable — keep last saved state */ },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
    }

    function saveCurrentAsHome() {
        const baseHome = {
            routeId: state.routeId,
            stopName: state.stopName,
            lat: null,
            lng: null
        };

        const commit = (homeObj, withGps) => {
            localStorage.setItem(STORAGE.HOME, JSON.stringify(homeObj));
            const routeName = PARSED_ROUTES[homeObj.routeId]?.name || homeObj.routeId;
            showToast(withGps ? `Home + GPS saved: ${homeObj.stopName}` : `Home saved: ${homeObj.stopName} (${routeName})`);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => commit({ ...baseHome, lat: pos.coords.latitude, lng: pos.coords.longitude }, true),
                () => commit(baseHome, false),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            commit(baseHome, false);
        }
    }

    // ------------------------------------------------------------------------
    // eGate Planner Modal
    // ------------------------------------------------------------------------
    function openEgateModal() {
        if (!DOM.egateModal) return;
        if (DOM.egateTimeInput && !DOM.egateTimeInput.value) {
            const now = new Date();
            now.setHours(now.getHours() + 2);
            DOM.egateTimeInput.value = `${String(now.getHours()).padStart(2, '0')}:00`;
        }
        DOM.egateModal.classList.remove('hidden');
    }

    function closeEgateModal() {
        if (DOM.egateModal) DOM.egateModal.classList.add('hidden');
    }

    function applyEgateFilter() {
        if (!DOM.egateTimeInput || !DOM.egateTimeInput.value) return;
        const mins = timeToMins(DOM.egateTimeInput.value);
        if (mins === null) return;

        state.egateMins = mins;

        // eGate is at EGHQ -> switch to "To EGHQ" automatically
        if (state.direction !== 'to') {
            state.direction = 'to';
            saveState();
            updateControlButtonsUI();
            updateStaticLabels();
            renderRouteMapBase();
        }

        const winStart = minsToTime(mins - EGATE_WINDOW_BEFORE_MIN);
        const winEnd = minsToTime(mins);
        if (DOM.egateWindowText) DOM.egateWindowText.textContent = `${winStart} – ${winEnd} (Arr. EGHQ)`;
        if (DOM.egateActiveBanner) {
            DOM.egateActiveBanner.classList.remove('hidden');
            DOM.egateActiveBanner.classList.add('flex');
        }

        closeEgateModal();
        renderSchedule(true);
    }

    function clearEgateFilter() {
        state.egateMins = null;
        if (DOM.egateActiveBanner) {
            DOM.egateActiveBanner.classList.add('hidden');
            DOM.egateActiveBanner.classList.remove('flex');
        }
        renderSchedule(true);
    }

    // ------------------------------------------------------------------------
    // Layover Screensaver + Comic Text Animation (also Triple-Tap Clock Easter Egg)
    // ------------------------------------------------------------------------
    function openScreensaver(fromOutsideDubai = false) {
        if (!DOM.screensaver) return;
        const theme = SCREENSAVER_THEMES[state.screensaverIndex % SCREENSAVER_THEMES.length];
        state.screensaverIndex++;

        if (DOM.screensaverImg) DOM.screensaverImg.src = theme.img;
        if (DOM.discoBallWrapper) DOM.discoBallWrapper.classList.toggle('hidden', theme.fx !== 'disco');
        if (DOM.wavesWrapper) DOM.wavesWrapper.classList.toggle('hidden', theme.fx !== 'waves');
        if (DOM.vinesWrapper) DOM.vinesWrapper.classList.toggle('hidden', theme.fx !== 'vines');

        const phrase = state.isGtaMode ? theme.gtaText : theme.text;
        if (DOM.comicTextContainer) {
            DOM.comicTextContainer.innerHTML = '';
            let charDelay = 0;
            phrase.split(' ').forEach((word) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'inline-flex';
                [...word].forEach((ch) => {
                    const span = document.createElement('span');
                    span.className = 'comic-letter';
                    span.textContent = ch;
                    const rot = (Math.random() * 10 - 5).toFixed(1);
                    span.style.setProperty('--rot', `${rot}deg`);
                    span.style.animationDelay = `${(charDelay * 0.045).toFixed(2)}s`;
                    wordSpan.appendChild(span);
                    charDelay++;
                });
                DOM.comicTextContainer.appendChild(wordSpan);
            });
        }

        if (DOM.screensaverSubtext) {
            DOM.screensaverSubtext.textContent = state.isGtaMode
                ? '(Out of Vice City / DXB range)'
                : '(It looks like you are not in DXB)';
            DOM.screensaverSubtext.style.animation = 'none';
            if (fromOutsideDubai) {
                void DOM.screensaverSubtext.offsetWidth;
                DOM.screensaverSubtext.style.animation = 'subtextPopAndFade 4.5s ease-in-out infinite';
            } else {
                DOM.screensaverSubtext.style.opacity = '0';
            }
        }

        DOM.screensaver.classList.remove('hidden');
        DOM.screensaver.classList.add('flex');
    }

    function closeScreensaver() {
        if (!DOM.screensaver) return;
        DOM.screensaver.classList.add('hidden');
        DOM.screensaver.classList.remove('flex');
    }

    // ------------------------------------------------------------------------
    // Onboarding Splash Screen (iOS Safari non-standalone)
    // ------------------------------------------------------------------------
    function initSplashScreen() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
        const alreadyDismissed = localStorage.getItem(STORAGE.SPLASH_DONE) === '1';

        if (!isIOS || isStandalone || alreadyDismissed || !DOM.splashScreen || !DOM.carouselTrack) return;

        DOM.carouselTrack.innerHTML = SPLASH_SLIDES.map((s) => `
            <div class="carousel-slide text-center">
                <div class="image-wrapper">
                    <img src="${s.img}" alt="${s.title}" class="carousel-image">
                </div>
                <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-1.5">${s.title}</h2>
                <p class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">${s.text}</p>
            </div>
        `).join('');

        DOM.splashScreen.classList.remove('hidden');

        let slideIdx = 0;
        const carouselTimer = setInterval(() => {
            slideIdx = (slideIdx + 1) % SPLASH_SLIDES.length;
            DOM.carouselTrack.style.transform = `translateX(-${slideIdx * 100}%)`;
        }, 3200);

        if (DOM.dismissSplash) {
            DOM.dismissSplash.addEventListener('click', () => {
                clearInterval(carouselTimer);
                localStorage.setItem(STORAGE.SPLASH_DONE, '1');
                DOM.splashScreen.classList.add('hidden');
            });
        }
    }

    // ------------------------------------------------------------------------
    // Connectivity Indicator (Online / Offline)
    // ------------------------------------------------------------------------
    function updateConnectivityUI() {
        if (!DOM.connectivityStatus) return;
        if (navigator.onLine) {
            DOM.connectivityStatus.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 text-[10px] font-bold uppercase tracking-wider shrink-0';
            DOM.connectivityStatus.innerHTML = `<span class="relative flex h-1.5 w-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>Live`;
        } else {
            DOM.connectivityStatus.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold uppercase tracking-wider shrink-0';
            DOM.connectivityStatus.innerHTML = `<span class="inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>Offline`;
        }
    }

    // ------------------------------------------------------------------------
    // Selection Change Orchestrator
    // ------------------------------------------------------------------------
    function onSelectionChanged(autoScroll = true) {
        updateControlButtonsUI();
        updateStaticLabels();
        renderRouteMapBase();
        renderSchedule(autoScroll);
        tick();
    }

    // ------------------------------------------------------------------------
    // Event Listeners
    // ------------------------------------------------------------------------
    function bindEvents() {
        if (DOM.btnModeAuto) {
            DOM.btnModeAuto.addEventListener('click', () => {
                state.mode = 'auto';
                saveState();
                updateControlButtonsUI();
                runAutoLocation(false);
            });
        }

        if (DOM.btnModeManual) {
            DOM.btnModeManual.addEventListener('click', () => {
                state.mode = 'manual';
                saveState();
                updateControlButtonsUI();
            });
        }

        if (DOM.routeDropdown) {
            DOM.routeDropdown.addEventListener('change', (e) => {
                state.routeId = e.target.value;
                populateStopSelector();
                saveState();
                onSelectionChanged(true);
            });
        }

        if (DOM.stopSelector) {
            DOM.stopSelector.addEventListener('change', (e) => {
                state.stopName = e.target.value;
                saveState();
                onSelectionChanged(true);
            });
        }

        if (DOM.btnSaveHome) {
            DOM.btnSaveHome.addEventListener('click', saveCurrentAsHome);
        }

        if (DOM.btnFromEghq) {
            DOM.btnFromEghq.addEventListener('click', () => {
                state.direction = 'from';
                saveState();
                onSelectionChanged(true);
            });
        }

        if (DOM.btnToEghq) {
            DOM.btnToEghq.addEventListener('click', () => {
                state.direction = 'to';
                saveState();
                onSelectionChanged(true);
            });
        }

        if (DOM.btnCenterSchedule) {
            DOM.btnCenterSchedule.addEventListener('click', centerScheduleScroll);
        }

        // Fullscreen Countdown
        if (DOM.btnExpandFs) {
            DOM.btnExpandFs.addEventListener('click', () => {
                state.isFullscreen = true;
                if (DOM.fsOverlay) DOM.fsOverlay.classList.remove('hidden');
                tick();
            });
        }

        if (DOM.btnCloseFs) {
            DOM.btnCloseFs.addEventListener('click', () => {
                state.isFullscreen = false;
                if (DOM.fsOverlay) DOM.fsOverlay.classList.add('hidden');
            });
        }

        // eGate Modal
        if (DOM.btnEgatePlanner) DOM.btnEgatePlanner.addEventListener('click', openEgateModal);
        if (DOM.btnCloseEgate) DOM.btnCloseEgate.addEventListener('click', closeEgateModal);
        if (DOM.btnFindEgate) DOM.btnFindEgate.addEventListener('click', applyEgateFilter);
        if (DOM.btnClearEgate) DOM.btnClearEgate.addEventListener('click', clearEgateFilter);
        if (DOM.egateModal) {
            DOM.egateModal.addEventListener('click', (e) => {
                if (e.target === DOM.egateModal) closeEgateModal();
            });
        }

        // Triple-tap clock easter egg -> Screensaver
        if (DOM.clockContainer) {
            DOM.clockContainer.addEventListener('click', () => {
                state.clockTapCount++;
                clearTimeout(state.clockTapTimer);
                if (state.clockTapCount >= 3) {
                    state.clockTapCount = 0;
                    openScreensaver(false);
                } else {
                    state.clockTapTimer = setTimeout(() => { state.clockTapCount = 0; }, 550);
                }
            });
        }

        if (DOM.btnCloseScreensaver) {
            DOM.btnCloseScreensaver.addEventListener('click', closeScreensaver);
        }

        // Escape key closes overlays
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeEgateModal();
                closeScreensaver();
                if (state.isFullscreen && DOM.fsOverlay) {
                    state.isFullscreen = false;
                    DOM.fsOverlay.classList.add('hidden');
                }
            }
        });

        // Online/Offline & System Dark Mode
        window.addEventListener('online', updateConnectivityUI);
        window.addEventListener('offline', updateConnectivityUI);
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateMetaThemeColor);
        }
    }

    // ------------------------------------------------------------------------
    // Service Worker Registration
    // ------------------------------------------------------------------------
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(() => { /* ignore */ });
            });
        }
    }

    // ------------------------------------------------------------------------
    // Bootstrap
    // ------------------------------------------------------------------------
    function init() {
        initParsedRoutes();
        validateState();
        initWantedStars();
        populateRouteDropdown();
        populateStopSelector();
        updateConnectivityUI();
        initGtaFloatingButton();
        bindEvents();

        // Apply saved GTA VI skin state (also renders map, schedule, and first tick)
        applyGtaMode(state.isGtaMode, false);
        updateControlButtonsUI();
        requestAnimationFrame(() => centerScheduleScroll());

        // Start 1-second live heartbeat
        setInterval(tick, 1000);

        // Optional onboarding & GPS auto-detect
        initSplashScreen();
        runAutoLocation(false);
        registerServiceWorker();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
