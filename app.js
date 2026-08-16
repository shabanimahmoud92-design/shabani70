(function () {
  const STORAGE_KEY = "shift-management:v1";
  const AUTH = window.AUTH_CONFIG;
  const PERIOD_START_DAY = 21;
  const PERIOD_END_DAY = 20;
  const COMPANY_THURSDAY_TITLE = "پنج‌شنبه تعطیل شرکت";
  const DEFAULT_MANUAL_OVERRIDES = {
    "1405/05/29": { hamed: "off" },
    "1405/05/25": { hamed: "work" },
    "1405/05/26": { hamed: "work" },
    "1405/06/09": { hamed: "off" },
  };
  let currentUser = null;
  let appInitialized = false;

  const state = {
    jy: null,
    jm: null,
    skipHolidays: false,
    startPerson: "hamed",
    periodMode: true,
    monthlyOffs: {},
    companyHolidays: [],
    manualOverrides: { ...DEFAULT_MANUAL_OVERRIDES },
  };

  function isAdmin() {
    return currentUser?.role === "admin";
  }

  function requireAdmin() {
    if (isAdmin()) return true;
    alert("فقط مدیر اجازه تغییر اطلاعات را دارد.");
    return false;
  }

  function accountFor(username) {
    return AUTH?.accounts?.[String(username || "").trim().toLowerCase()] || null;
  }

  function loadAuthSession() {
    try {
      const raw = sessionStorage.getItem(AUTH.sessionKey);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return accountFor(saved.username);
    } catch (_) {
      return null;
    }
  }

  function saveAuthSession(account) {
    sessionStorage.setItem(
      AUTH.sessionKey,
      JSON.stringify({ username: account.username })
    );
  }

  function applyAccessControls() {
    const admin = isAdmin();
    document.body.classList.toggle("viewer-mode", !admin);
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.hidden = !admin;
    });
    document.querySelectorAll("[data-viewer-only]").forEach((el) => {
      el.hidden = admin;
    });

    [
      "periodMode",
      "skipHolidays",
      "startPerson",
      "totalNormalOff",
      "totalThursdayOff",
      "hamedNormalOff",
      "hamedThursdayOff",
      "mehdiNormalOff",
      "mehdiThursdayOff",
      "clearOverridesBtn",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !admin;
    });
    document
      .querySelectorAll("#thursdayCompanyList input, select.cell-shift")
      .forEach((el) => { el.disabled = !admin; });

    const hint = document.getElementById("rosterEditHint");
    if (hint) {
      hint.textContent = admin
        ? "روی هر خانه کلیک کنید و از لیست «صبح»، «شب» یا «خالی (آف)» را انتخاب کنید. تغییرات ذخیره می‌شوند و در گزارش و اکسل هم اعمال می‌گردند."
        : "نمای فقط‌خواندنی؛ برای تغییر شیفت باید با حساب مدیر وارد شوید.";
    }
  }

  function showApp(account) {
    currentUser = account;
    document.getElementById("loginScreen").hidden = true;
    document.getElementById("appRoot").hidden = false;
    document.getElementById("currentUserName").textContent = account.displayName;
    document.getElementById("currentUserRole").textContent = account.roleLabel;
    if (!appInitialized) {
      initApp();
      appInitialized = true;
    } else {
      applyAccessControls();
      renderAll();
    }
  }

  function initAuth() {
    if (!AUTH?.accounts) {
      document.getElementById("loginError").textContent =
        "تنظیمات ورود بارگذاری نشد.";
      return;
    }

    document.getElementById("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const username = document.getElementById("loginUsername").value;
      const password = document.getElementById("loginPassword").value;
      const account = accountFor(username);
      if (!account || account.password !== password) {
        document.getElementById("loginError").textContent =
          "نام کاربری یا رمز عبور نادرست است.";
        return;
      }
      document.getElementById("loginError").textContent = "";
      saveAuthSession(account);
      showApp(account);
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem(AUTH.sessionKey);
      window.location.reload();
    });

    const session = loadAuthSession();
    if (session) showApp(session);
  }

  function todayJalali() {
    const now = new Date();
    return Jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      state.skipHolidays = !!data.skipHolidays;
      state.startPerson = data.startPerson === "mehdi" ? "mehdi" : "hamed";
      state.periodMode = data.periodMode !== false;
      state.monthlyOffs =
        data.monthlyOffs && typeof data.monthlyOffs === "object"
          ? data.monthlyOffs
          : {};
      state.companyHolidays = Array.isArray(data.companyHolidays)
        ? data.companyHolidays
        : [];
      state.manualOverrides = {
        ...DEFAULT_MANUAL_OVERRIDES,
        ...(data.manualOverrides && typeof data.manualOverrides === "object"
          ? data.manualOverrides
          : {}),
      };
      // seed: آف مقدسی از ۲۲ → ۲۹ مرداد (حذف ۲۲ قدیمی از localStorage)
      const day22 = state.manualOverrides["1405/05/22"];
      if (day22?.hamed === "off") {
        const next22 = { ...day22 };
        delete next22.hamed;
        if (Object.keys(next22).length) {
          state.manualOverrides["1405/05/22"] = next22;
        } else {
          delete state.manualOverrides["1405/05/22"];
        }
      }
      const day29 = state.manualOverrides["1405/05/29"];
      if (!day29 || day29.hamed == null) {
        state.manualOverrides["1405/05/29"] = { ...day29, hamed: "off" };
      }
    } catch (_) {
      /* ignore */
    }
  }

  function saveState() {
    if (!isAdmin()) return false;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        skipHolidays: state.skipHolidays,
        startPerson: state.startPerson,
        periodMode: state.periodMode,
        monthlyOffs: state.monthlyOffs,
        companyHolidays: state.companyHolidays,
        manualOverrides: state.manualOverrides,
      })
    );
    return true;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function keyOf(jy, jm, jd) {
    return `${jy}/${pad(jm)}/${pad(jd)}`;
  }

  function parseJalaliInput(text) {
    const m = String(text).trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) return null;
    const jy = Number(m[1]);
    const jm = Number(m[2]);
    const jd = Number(m[3]);
    if (jm < 1 || jm > 12) return null;
    if (jd < 1 || jd > Jalaali.monthLength(jy, jm)) return null;
    return { jy, jm, jd };
  }

  function officialHolidays(jy, jm, jd) {
    const list = IRAN_HOLIDAYS[jy] || [];
    return list.filter((h) => h.m === jm && h.d === jd);
  }

  function companyHolidays(jy, jm, jd) {
    const k = keyOf(jy, jm, jd);
    return state.companyHolidays.filter((h) => h.date === k);
  }

  function isFriday(jy, jm, jd) {
    const g = Jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(g.gy, g.gm - 1, g.gd);
    return dt.getDay() === 5;
  }

  function isSaturday(jy, jm, jd) {
    const g = Jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(g.gy, g.gm - 1, g.gd);
    return dt.getDay() === 6;
  }

  function isThursday(jy, jm, jd) {
    const g = Jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(g.gy, g.gm - 1, g.gd);
    return dt.getDay() === 4;
  }

  function weekdayIndexSatStart(jy, jm, jd) {
    const g = Jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(g.gy, g.gm - 1, g.gd);
    return (dt.getDay() + 1) % 7;
  }

  function makeDay(jy, jm, jd) {
    const official = officialHolidays(jy, jm, jd);
    const company = companyHolidays(jy, jm, jd);
    const friday = isFriday(jy, jm, jd);
    const saturday = isSaturday(jy, jm, jd);
    const thursday = isThursday(jy, jm, jd);
    return {
      jy,
      jm,
      jd,
      key: keyOf(jy, jm, jd),
      official,
      company,
      isFriday: friday,
      isSaturday: saturday,
      isThursday: thursday,
      isOfficial: official.length > 0,
      isCompany: company.length > 0,
      isHoliday: official.length > 0 || company.length > 0 || friday,
    };
  }

  function buildMonthDays(jy, jm) {
    const daysInMonth = Jalaali.monthLength(jy, jm);
    const days = [];
    for (let jd = 1; jd <= daysInMonth; jd += 1) {
      days.push(makeDay(jy, jm, jd));
    }
    return days;
  }

  function nextMonth(jy, jm) {
    return jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 };
  }

  function buildPeriodDays(jy, jm) {
    const days = [];
    const endOfMonth = Jalaali.monthLength(jy, jm);
    for (let jd = PERIOD_START_DAY; jd <= endOfMonth; jd += 1) {
      days.push(makeDay(jy, jm, jd));
    }
    const nx = nextMonth(jy, jm);
    for (let jd = 1; jd <= PERIOD_END_DAY; jd += 1) {
      days.push(makeDay(nx.jy, nx.jm, jd));
    }
    return days;
  }

  function buildDays(jy, jm) {
    return state.periodMode ? buildPeriodDays(jy, jm) : buildMonthDays(jy, jm);
  }

  function weekdayIndexFriStart(jy, jm, jd) {
    const g = Jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(g.gy, g.gm - 1, g.gd);
    return (dt.getDay() + 2) % 7;
  }

  function weekIndex(jy, jm, jd) {
    const weekday = weekdayIndexFriStart(jy, jm, jd);
    const weekStartJdn = Jalaali.j2d(jy, jm, jd) - weekday;
    return Math.floor(weekStartJdn / 7);
  }

  function resolvePerson(id) {
    return PEOPLE[id] || PEOPLE.hamed;
  }

  function quotaKey(jy, jm) {
    return `${jy}-${pad(jm)}`;
  }

  function numOrEmpty(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : null;
  }

  /* سهمیه‌ها فقط از ورودی کاربر؛ خالی/۰ = هیچ آف برنامه‌ای اضافه نشود */
  function quotaFor(jy, jm) {
    const saved = state.monthlyOffs[quotaKey(jy, jm)] || {};
    const hamedNormal = numOrEmpty(saved.hamed?.normal);
    const mehdiNormal = numOrEmpty(saved.mehdi?.normal);
    const hamedThu = numOrEmpty(saved.hamed?.thursday);
    const mehdiThu = numOrEmpty(saved.mehdi?.thursday);
    const hasPersonSplit =
      hamedNormal !== null ||
      mehdiNormal !== null ||
      hamedThu !== null ||
      mehdiThu !== null;

    const totalNormal = numOrEmpty(saved.normal) ?? 0;
    const totalThursday = numOrEmpty(saved.thursday) ?? 0;

    if (hasPersonSplit) {
      return {
        mode: "person",
        hamed: {
          normal: hamedNormal ?? 0,
          thursday: hamedThu ?? 0,
        },
        mehdi: {
          normal: mehdiNormal ?? 0,
          thursday: mehdiThu ?? 0,
        },
      };
    }

    return {
      mode: "total",
      normal: totalNormal,
      thursday: totalThursday,
    };
  }

  function markMorningOff(day, type, reason) {
    const thursdayTypes = new Set([
      "quota-thursday",
      "thursday-holiday",
      "thursday-company",
    ]);
    day.morningOff = {
      type,
      reason,
      label: thursdayTypes.has(type) ? "OFF-پنجشنبه" : "OFF",
    };
  }

  function applyQuotaPerson(days, personId, count, thursdayOnly) {
    if (!count) return;
    let remaining = count;
    for (const day of days) {
      if (remaining <= 0) break;
      if (day.off || day.morningOff || day.morning?.id !== personId) continue;
      if (thursdayOnly !== day.isThursday) continue;
      markMorningOff(
        day,
        thursdayOnly ? "quota-thursday" : "quota-normal",
        thursdayOnly ? "آف پنج‌شنبه ماهانه" : "آف عادی ماهانه"
      );
      remaining -= 1;
    }
  }

  function applyQuotaTotal(days, count, thursdayOnly) {
    if (!count) return;
    let remaining = count;
    for (const day of days) {
      if (remaining <= 0) break;
      if (day.off || day.morningOff) continue;
      if (thursdayOnly !== day.isThursday) continue;
      markMorningOff(
        day,
        thursdayOnly ? "quota-thursday" : "quota-normal",
        thursdayOnly ? "آف پنج‌شنبه ماهانه" : "آف عادی ماهانه"
      );
      remaining -= 1;
    }
  }

  function normalizeOverride(action) {
    if (action === "صبح" || action === "شب") return action;
    if (action === "off" || action === "" || action === "empty") return "off";
    if (action === "work") return "work";
    return null;
  }

  function getCellOverride(dateKey, personId) {
    const raw = state.manualOverrides[dateKey]?.[personId];
    return normalizeOverride(raw);
  }

  function setCellOverride(dateKey, personId, value) {
    if (!isAdmin()) return;
    const next = normalizeOverride(value);
    const bucket = { ...(state.manualOverrides[dateKey] || {}) };
    if (!next || next === "auto") {
      delete bucket[personId];
    } else {
      bucket[personId] = next;
    }
    if (Object.keys(bucket).length) {
      state.manualOverrides[dateKey] = bucket;
    } else {
      delete state.manualOverrides[dateKey];
    }
    saveState();
  }

  function clearOverridesInDays(days) {
    if (!isAdmin()) return;
    days.forEach((day) => {
      delete state.manualOverrides[day.key];
    });
    // keep seeded defaults that fall outside this view
    saveState();
  }

  function applyManualOverrides(days) {
    for (const day of days) {
      const overrides = state.manualOverrides[day.key];
      if (!overrides) continue;

      day.personOff = day.personOff || {};
      day.cellOverride = day.cellOverride || {};
      for (const [personId, raw] of Object.entries(overrides)) {
        const action = normalizeOverride(raw);
        if (!action) continue;
        day.cellOverride[personId] = action;

        if (action === "صبح" || action === "شب" || action === "work") {
          delete day.personOff[personId];
          if (day.off) {
            day.off = false;
            day.night = resolvePerson(
              day.morning?.id === "hamed" ? "mehdi" : "hamed"
            );
          }
          if (day.morning?.id === personId) {
            day.morningOff = null;
          }
          continue;
        }

        if (action === "off") {
          day.personOff[personId] = true;
          if (day.morning?.id === personId) {
            markMorningOff(day, "manual", "OFF");
          }
        }
      }
    }
  }

  function personIsOff(day, personId) {
    const ov = day.cellOverride?.[personId] ?? getCellOverride(day.key, personId);
    if (ov === "صبح" || ov === "شب" || ov === "work") return false;
    if (ov === "off") return true;
    return (
      day.off ||
      Boolean(day.personOff?.[personId]) ||
      (day.morning?.id === personId && Boolean(day.morningOff))
    );
  }

  function assignShifts(days, options = {}) {
    const pendingCompensations = options.pendingCompensations || [];
    const quotaJy = options.quotaJy ?? days[0]?.jy;
    const quotaJm = options.quotaJm ?? days[0]?.jm;

    // الگوی پایه دست‌نخورده: چرخش هفتگی جمعه تا پنجشنبه
    const assigned = days.map((day) => {
      const startId = state.startPerson === "mehdi" ? "mehdi" : "hamed";
      const otherId = startId === "hamed" ? "mehdi" : "hamed";
      const morningIsStart = weekIndex(day.jy, day.jm, day.jd) % 2 === 0;
      const morning = resolvePerson(morningIsStart ? startId : otherId);
      const night = resolvePerson(morning.id === "hamed" ? "mehdi" : "hamed");
      return { ...day, morning, night, morningOff: null, off: false };
    });

    for (const day of assigned) {
      // تعطیلی شرکت غیرپنج‌شنبه: فقط اگر گزینه فعال باشد، کل روز OFF
      // پنج‌شنبه تعطیل شرکت/رسمی → فقط صبح OFF (شب برقرار)
      if (state.skipHolidays && day.isCompany && !day.isThursday) {
        day.off = true;
        day.night = null;
        markMorningOff(day, "company", "تعطیلی شرکت");
        continue;
      }

      // شنبه و جمعه: فقط صبح OFF؛ شب برقرار
      if (day.isSaturday) {
        markMorningOff(day, "saturday", "استراحت شنبه");
      }
      if (day.isFriday) {
        markMorningOff(day, "friday", "استراحت جمعه");
      }
      // تعطیل رسمی: فقط صبح OFF؛ شب برقرار
      if (day.isOfficial) {
        markMorningOff(
          day,
          day.isThursday ? "thursday-holiday" : "official",
          day.isThursday ? "پنج‌شنبه تعطیل رسمی" : "تعطیل رسمی"
        );
      }
      // پنج‌شنبه تعطیل شرکت (علامت‌خورده): فقط صبح OFF؛ شب برقرار
      if (day.isThursday && day.isCompany && !day.morningOff) {
        markMorningOff(day, "thursday-company", "پنج‌شنبه تعطیل شرکت");
      }

      // جبرانی شب‌کار تعطیل رسمی روی اولین نوبت صبح همان نفر
      if (!day.morningOff) {
        const index = pendingCompensations.findIndex(
          (item) => item.personId === day.morning?.id
        );
        if (index >= 0) {
          const item = pendingCompensations.splice(index, 1)[0];
          markMorningOff(
            day,
            "compensation",
            `جبرانی شب تعطیل ${item.sourceDate}`
          );
        }
      }

      if (day.isOfficial && day.night) {
        pendingCompensations.push({
          personId: day.night.id,
          sourceDate: day.key,
        });
      }
    }

    // آف‌های ماهانه فقط اگر کاربر عدد داده باشد
    const quota = quotaFor(quotaJy, quotaJm);
    if (quota.mode === "person") {
      for (const personId of ["hamed", "mehdi"]) {
        applyQuotaPerson(assigned, personId, quota[personId].thursday, true);
        applyQuotaPerson(assigned, personId, quota[personId].normal, false);
      }
    } else {
      applyQuotaTotal(assigned, quota.thursday, true);
      applyQuotaTotal(assigned, quota.normal, false);
    }

    // استثناهای دستی همیشه آخر اعمال می‌شوند تا با بازتولید یا سهمیه‌ها پاک نشوند.
    applyManualOverrides(assigned);

    return assigned;
  }

  function rosterSummaryFor(days) {
    const summary = {};
    const holidayOrFridayDays = days.filter(
      (day) => day.isFriday || day.isOfficial
    ).length;
    for (const personId of ["hamed", "mehdi"]) {
      let normal = 0;
      let thursday = 0;
      let dayShifts = 0;
      let workedThursdays = 0;
      let holidayMorningOff = 0;
      for (const day of days) {
        const code = codeFor(personId, day);
        const workedMorning = code === "صبح";
        const workedNight = code === "شب";
        const isOff = !workedMorning && !workedNight;
        if (workedMorning) dayShifts += 1;
        if (day.isThursday && (workedMorning || workedNight)) {
          workedThursdays += 1;
        }
        if ((day.isFriday || day.isOfficial) && isOff) {
          const ov = day.cellOverride?.[personId] ?? getCellOverride(day.key, personId);
          if (
            ov === "off" ||
            day.off ||
            (day.morning?.id === personId && Boolean(day.morningOff))
          ) {
            holidayMorningOff += 1;
          }
        }
        if (isOff) {
          if (day.isThursday) thursday += 1;
          else normal += 1;
        }
      }
      summary[personId] = {
        dayShifts,
        workedThursdays,
        holidayMorningOff,
        holidayOrFridayDays,
        normal,
        thursday,
        total: normal + thursday,
      };
    }
    return summary;
  }

  function renderSummary(days) {
    let hamedMorning = 0;
    let hamedNight = 0;
    let mehdiMorning = 0;
    let mehdiNight = 0;
    days.forEach((day) => {
      const h = codeFor("hamed", day);
      const m = codeFor("mehdi", day);
      if (h === "صبح") hamedMorning += 1;
      if (h === "شب") hamedNight += 1;
      if (m === "صبح") mehdiMorning += 1;
      if (m === "شب") mehdiNight += 1;
    });
    document.getElementById("monthSummary").innerHTML = `
      <div class="stat"><span>حامد صبح / شب</span><strong>${hamedMorning} / ${hamedNight}</strong></div>
      <div class="stat"><span>مهدی صبح / شب</span><strong>${mehdiMorning} / ${mehdiNight}</strong></div>
    `;
  }

  function renderOffReport(days) {
    const summary = rosterSummaryFor(days);
    document.getElementById("offReportBody").innerHTML = ["hamed", "mehdi"]
      .map((personId) => {
        const person = resolvePerson(personId);
        const counts = summary[personId];
        return `<div class="off-report-row">
          <strong>${person.name}</strong>
          <span><small>شیفت روز (صبح)</small><b>${counts.dayShifts}</b></span>
          <span><small>پنج‌شنبه کارکرده</small><b>${counts.workedThursdays}</b></span>
          <span class="off-total"><small>OFF</small><b>${counts.total}</b></span>
          <span><small>آف صبح جمعه/تعطیل رسمی از کل روزهای دوره</small><b>${counts.holidayMorningOff} از ${counts.holidayOrFridayDays}</b></span>
          <span><small>OFF عادی</small><b>${counts.normal}</b></span>
          <span><small>OFF پنج‌شنبه</small><b>${counts.thursday}</b></span>
        </div>`;
      })
      .join("");
  }

  function periodTitle() {
    if (!state.periodMode) {
      return `${MONTH_NAMES[state.jm - 1]} ${state.jy}`;
    }
    const nx = nextMonth(state.jy, state.jm);
    return `${PERIOD_START_DAY} ${MONTH_NAMES[state.jm - 1]} تا ${PERIOD_END_DAY} ${MONTH_NAMES[nx.jm - 1]} ${state.jy}`;
  }

  function renderCalendar(days) {
    document.getElementById("monthTitle").textContent = periodTitle();

    const first = days[0];
    const firstWeekday = weekdayIndexSatStart(first.jy, first.jm, first.jd);
    const today = todayJalali();
    const root = document.getElementById("calendar");
    root.innerHTML = "";

    for (let i = 0; i < firstWeekday; i += 1) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      root.appendChild(empty);
    }

    days.forEach((day) => {
      const el = document.createElement("div");
      const classes = ["day"];
      if (day.isFriday) classes.push("friday");
      if (day.isOfficial) classes.push("is-holiday");
      if (day.isCompany) classes.push("is-company");
      if (day.jy === today.jy && day.jm === today.jm && day.jd === today.jd) {
        classes.push("today");
      }
      if (
        currentUser?.personId &&
        (day.morning?.id === currentUser.personId ||
          day.night?.id === currentUser.personId)
      ) {
        classes.push("own-shift");
      }
      el.className = classes.join(" ");

      const names = [
        ...day.official.map((h) => h.title),
        ...day.company.map((h) => h.title),
      ].join(" · ");

      el.innerHTML = `
        <div class="day-num">${day.jd}</div>
        <div class="day-editors">
          <label class="day-person hamed">
            <span>مقدسی</span>
            ${shiftSelectHtml("hamed", day, "compact")}
          </label>
          <label class="day-person mehdi">
            <span>ارجمندزاده</span>
            ${shiftSelectHtml("mehdi", day, "compact")}
          </label>
        </div>
        ${day.isOfficial ? `<span class="badge holiday">تعطیل رسمی</span>` : ""}
        ${day.isCompany ? `<span class="badge company">تعطیل شرکت</span>` : ""}
        ${names ? `<div class="holiday-name">${names}</div>` : ""}
      `;
      root.appendChild(el);
    });
  }

  function renderRosterEditor(days) {
    const root = document.getElementById("rosterEditor");
    if (!root) return;

    const weekdayCells = days
      .map((d) => {
        const wd = weekdayName(d.jy, d.jm, d.jd);
        const cls = d.isFriday || d.isOfficial ? "fri" : d.isThursday ? "thu" : "";
        return `<th class="${cls}">${wd}</th>`;
      })
      .join("");
    const dateCells = days
      .map((d) => {
        const cls = d.isFriday || d.isOfficial ? "fri" : d.isCompany ? "company" : "";
        return `<th class="${cls}">${d.jd}</th>`;
      })
      .join("");

    const personRow = (personId, label) =>
      days
        .map((d) => {
          const code = codeFor(personId, d);
          const cls = cellClass(d, code, personId);
          return `<td class="${cls}">${shiftSelectHtml(personId, d)}</td>`;
        })
        .join("");

    root.innerHTML = `<table class="roster-table">
      <thead>
        <tr>
          <th class="sticky-col title" colspan="2">${periodTitle()}</th>
          ${weekdayCells}
        </tr>
        <tr>
          <th class="sticky-col">نفرات</th>
          <th></th>
          ${dateCells}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th class="sticky-col" colspan="2">ارجمندزاده</th>
          ${personRow("mehdi", "ارجمندزاده")}
        </tr>
        <tr>
          <th class="sticky-col" colspan="2">مقدسی</th>
          ${personRow("hamed", "مقدسی")}
        </tr>
      </tbody>
    </table>`;
  }

  function renderShiftList(days) {
    const list = document.getElementById("shiftList");
    list.innerHTML = days
      .map((day) => {
        const h = codeFor("hamed", day);
        const m = codeFor("mehdi", day);
        const parts = [];
        if (m) parts.push(`ارجمندزاده ${m}`);
        if (h) parts.push(`مقدسی ${h}`);
        const who = parts.join(" · ");
        const mark =
          day.isOfficial || day.isCompany
            ? " · تعطیل"
            : day.isFriday
              ? " · جمعه"
              : day.isSaturday
                ? " · شنبه"
                : day.isThursday
                  ? " · پنج‌شنبه"
                  : "";
        return `<li><span>${day.key}${mark}</span><strong>${who}</strong></li>`;
      })
      .join("");
  }

  function renderOfficialHolidaysList(days) {
    const heading = document.getElementById("officialHolidaysHeading");
    const list = document.getElementById("officialHolidaysList");
    if (!heading || !list) return;

    heading.textContent = state.periodMode
      ? "تعطیلات رسمی این دوره"
      : "تعطیلات رسمی این ماه";

    const rows = [];
    const seen = new Set();
    days.forEach((day) => {
      (day.official || []).forEach((h) => {
        const id = `${day.key}|${h.title}`;
        if (seen.has(id)) return;
        seen.add(id);
        rows.push({
          label: `${day.jd} ${MONTH_NAMES[day.jm - 1]} ${day.jy}`,
          title: h.title,
        });
      });
    });

    if (!rows.length) {
      list.innerHTML = "<li><span>در این بازه تعطیل رسمی ثبت نشده</span></li>";
      return;
    }

    list.innerHTML = rows
      .map(
        (r) =>
          `<li><span>${r.label}</span><strong>${r.title}</strong></li>`
      )
      .join("");
  }

  function renderCompanyList() {
    const list = document.getElementById("companyList");
    const rows = state.companyHolidays
      .slice()
      .filter((h) => h.title !== COMPANY_THURSDAY_TITLE)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length) {
      list.innerHTML = "<li><span>موردی ثبت نشده</span></li>";
      return;
    }
    list.innerHTML = rows
      .map(
        (h, idx) => `
        <li>
          <span>${h.date} — ${h.title}</span>
          ${isAdmin() ? `<button type="button" data-idx="${idx}">حذف</button>` : ""}
        </li>`
      )
      .join("");
  }

  function listThursdaysInView() {
    return buildDays(state.jy, state.jm).filter((d) => d.isThursday);
  }

  function isCompanyThursdayMarked(dateKey) {
    return state.companyHolidays.some(
      (h) => h.date === dateKey && h.title === COMPANY_THURSDAY_TITLE
    );
  }

  function renderThursdayCompanyPicker() {
    const root = document.getElementById("thursdayCompanyList");
    const thursdays = listThursdaysInView();
    document.getElementById("thursdayHint").textContent = state.periodMode
      ? `پنج‌شنبه‌های همین دوره (${periodTitle()}) را که تعطیل شرکت هستند انتخاب کنید.`
      : `پنج‌شنبه‌های ${MONTH_NAMES[state.jm - 1]} ${state.jy} را که تعطیل شرکت هستند انتخاب کنید.`;

    if (!thursdays.length) {
      root.innerHTML = "<p class='hint'>پنج‌شنبه‌ای در این بازه نیست.</p>";
      return;
    }

    root.innerHTML = thursdays
      .map((d) => {
        const checked = isCompanyThursdayMarked(d.key) ? "checked" : "";
        const wd = weekdayName(d.jy, d.jm, d.jd);
        return `<label class="thursday-row">
          <input type="checkbox" data-thursday-date="${d.key}" ${checked} ${isAdmin() ? "" : "disabled"} />
          <span>${d.key} — ${wd}</span>
        </label>`;
      })
      .join("");
  }

  function saveThursdayCompanyPicker() {
    if (!requireAdmin()) return;
    const boxes = document.querySelectorAll("#thursdayCompanyList input[data-thursday-date]");
    const selected = new Set();
    boxes.forEach((box) => {
      if (box.checked) selected.add(box.dataset.thursdayDate);
    });

    const viewKeys = new Set(listThursdaysInView().map((d) => d.key));

    state.companyHolidays = state.companyHolidays.filter((h) => {
      if (h.title !== COMPANY_THURSDAY_TITLE) return true;
      if (!viewKeys.has(h.date)) return true;
      return selected.has(h.date);
    });

    selected.forEach((date) => {
      const exists = state.companyHolidays.some(
        (h) => h.date === date && h.title === COMPANY_THURSDAY_TITLE
      );
      if (!exists) {
        state.companyHolidays.push({ date, title: COMPANY_THURSDAY_TITLE });
      }
    });

    saveState();
    renderAll();
  }

  function inputValueOrBlank(el) {
    const raw = el.value.trim();
    return raw === "" ? null : Math.max(0, Number(raw) || 0);
  }

  function renderQuotaInputs() {
    const saved = state.monthlyOffs[quotaKey(state.jy, state.jm)] || {};
    document.getElementById("quotaMonthTitle").textContent =
      `آف‌های دوره ${MONTH_NAMES[state.jm - 1]} ${state.jy}`;

    document.getElementById("totalNormalOff").value =
      saved.normal === undefined || saved.normal === null ? "" : saved.normal;
    document.getElementById("totalThursdayOff").value =
      saved.thursday === undefined || saved.thursday === null ? "" : saved.thursday;

    document.getElementById("hamedNormalOff").value =
      saved.hamed?.normal === undefined || saved.hamed?.normal === null
        ? ""
        : saved.hamed.normal;
    document.getElementById("hamedThursdayOff").value =
      saved.hamed?.thursday === undefined || saved.hamed?.thursday === null
        ? ""
        : saved.hamed.thursday;
    document.getElementById("mehdiNormalOff").value =
      saved.mehdi?.normal === undefined || saved.mehdi?.normal === null
        ? ""
        : saved.mehdi.normal;
    document.getElementById("mehdiThursdayOff").value =
      saved.mehdi?.thursday === undefined || saved.mehdi?.thursday === null
        ? ""
        : saved.mehdi.thursday;
  }

  function saveQuotaInputs() {
    if (!requireAdmin()) return;
    const value = {
      normal: inputValueOrBlank(document.getElementById("totalNormalOff")),
      thursday: inputValueOrBlank(document.getElementById("totalThursdayOff")),
      hamed: {
        normal: inputValueOrBlank(document.getElementById("hamedNormalOff")),
        thursday: inputValueOrBlank(document.getElementById("hamedThursdayOff")),
      },
      mehdi: {
        normal: inputValueOrBlank(document.getElementById("mehdiNormalOff")),
        thursday: inputValueOrBlank(document.getElementById("mehdiThursdayOff")),
      },
    };
    state.monthlyOffs[quotaKey(state.jy, state.jm)] = value;
    saveState();
    renderAll();
  }

  function renderAll() {
    const days = assignShifts(buildDays(state.jy, state.jm), {
      quotaJy: state.jy,
      quotaJm: state.jm,
    });
    renderSummary(days);
    renderOffReport(days);
    renderCalendar(days);
    renderRosterEditor(days);
    renderOfficialHolidaysList(days);
    renderShiftList(days);
    renderCompanyList();
    renderThursdayCompanyPicker();
    document.getElementById("skipHolidays").checked = state.skipHolidays;
    document.getElementById("startPerson").value = state.startPerson;
    document.getElementById("periodMode").checked = state.periodMode;
    renderQuotaInputs();
    document.getElementById("rotationHint").textContent = state.periodMode
      ? `دوره از ${PERIOD_START_DAY} هر ماه تا ${PERIOD_END_DAY} ماه بعد؛ هفته از جمعه و چرخش صبح/شب یک‌هفته‌درمیان.`
      : "نمای ماه تقویمی؛ هفته از جمعه و چرخش صبح/شب یک‌هفته‌درمیان.";
    applyAccessControls();
    return days;
  }

  function codeFor(personId, day) {
    const ov = day.cellOverride?.[personId] ?? getCellOverride(day.key, personId);
    if (ov === "صبح" || ov === "شب") return ov;
    if (ov === "off") return "";
    // "work" یا بدون override: از برنامه خودکار
    if (personIsOff(day, personId)) return "";
    if (day.morning?.id === personId) return "صبح";
    if (day.night?.id === personId) return "شب";
    return "";
  }

  function selectOptionsHtml(selected) {
    const opts = [
      { value: "صبح", label: "صبح" },
      { value: "شب", label: "شب" },
      { value: "off", label: "خالی (آف)" },
    ];
    return opts
      .map(
        (o) =>
          `<option value="${o.value}" ${selected === o.value ? "selected" : ""}>${o.label}</option>`
      )
      .join("");
  }

  function effectiveSelectValue(personId, day) {
    const ov = day.cellOverride?.[personId] ?? getCellOverride(day.key, personId);
    if (ov === "صبح" || ov === "شب" || ov === "off") return ov;
    const code = codeFor(personId, day);
    if (code === "صبح" || code === "شب") return code;
    return "off";
  }

  function shiftSelectHtml(personId, day, extraClass = "") {
    const value = effectiveSelectValue(personId, day);
    const ov = day.cellOverride?.[personId] ?? getCellOverride(day.key, personId);
    const edited = ov === "صبح" || ov === "شب" || ov === "off";
    const codeClass =
      value === "صبح" ? "morning" : value === "شب" ? "night" : "empty";
    const disabled = isAdmin() ? "" : "disabled";
    return `<select class="cell-shift ${extraClass} ${codeClass}${edited ? " is-edited" : ""}" data-date="${day.key}" data-person="${personId}" title="تغییر شیفت دستی" aria-label="شیفت ${resolvePerson(personId).name} در ${day.key}" ${disabled}>
      ${selectOptionsHtml(value)}
    </select>`;
  }

  function weekdayName(jy, jm, jd) {
    const g = Jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(g.gy, g.gm - 1, g.gd);
    return WEEKDAY_NAMES[(dt.getDay() + 1) % 7];
  }

  function exportCsv() {
    const days = assignShifts(buildDays(state.jy, state.jm), {
      quotaJy: state.jy,
      quotaJm: state.jm,
    });
    const lines = [
      "date,weekday,hamed,mehdi,official_holiday,company_holiday,titles",
    ];
    days.forEach((day) => {
      const titles = [
        ...day.official.map((h) => h.title),
        ...day.company.map((h) => h.title),
      ]
        .join(" | ")
        .replaceAll(",", "،");
      lines.push(
        [
          day.key,
          weekdayName(day.jy, day.jm, day.jd),
          codeFor("hamed", day),
          codeFor("mehdi", day),
          day.isOfficial ? "yes" : "no",
          day.isCompany ? "yes" : "no",
          titles,
        ].join(",")
      );
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shifts-${state.jy}-${pad(state.jm)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function cellClass(day, code, personId) {
    if (!code || personIsOff(day, personId)) {
      if (day.morningOff?.label === "OFF-پنجشنبه" && day.morning?.id === personId) {
        return "off-thursday";
      }
      return "off";
    }
    if (day.isFriday || day.isOfficial) return "fri";
    if (day.isCompany) return "company";
    if (code === "صبح") return "morning";
    if (code === "شب") return "night";
    return "";
  }

  function buildTableHtml(jy, jm, pendingCompensations = []) {
    const days = assignShifts(buildDays(jy, jm), {
      quotaJy: jy,
      quotaJm: jm,
      pendingCompensations,
    });
    const nx = nextMonth(jy, jm);
    const month = state.periodMode
      ? `${MONTH_NAMES[jm - 1]} ${jy} — دوره ${PERIOD_START_DAY} ${MONTH_NAMES[jm - 1]} تا ${PERIOD_END_DAY} ${MONTH_NAMES[nx.jm - 1]}`
      : `${MONTH_NAMES[jm - 1]} ${jy}`;

    const weekdayCells = days
      .map((d) => {
        const wd = weekdayName(d.jy, d.jm, d.jd);
        const cls = d.isFriday || d.isOfficial ? "fri" : d.isThursday ? "thu" : "";
        return `<td class="${cls}">${wd}</td>`;
      })
      .join("");
    const dateCells = days
      .map((d) => {
        const cls = d.isFriday || d.isOfficial ? "fri" : d.isCompany ? "company" : "";
        return `<td class="${cls}">${d.jd}</td>`;
      })
      .join("");
    const mehdiCells = days
      .map((d) => {
        const code = codeFor("mehdi", d);
        return `<td class="${cellClass(d, code, "mehdi")}">${code}</td>`;
      })
      .join("");
    const hamedCells = days
      .map((d) => {
        const code = codeFor("hamed", d);
        return `<td class="${cellClass(d, code, "hamed")}">${code}</td>`;
      })
      .join("");
    const reportSummary = rosterSummaryFor(days);
    const reportSummaryRows = ["hamed", "mehdi"]
      .map((personId) => {
        const person = resolvePerson(personId);
        const counts = reportSummary[personId];
        return `<tr>
    <td class="label">${person.name}</td>
    <td>${counts.dayShifts}</td>
    <td>${counts.workedThursdays}</td>
    <td class="summary-total">${counts.total}</td>
    <td>${counts.holidayMorningOff} از ${counts.holidayOrFridayDays}</td>
    <td>${counts.normal}</td>
    <td>${counts.thursday}</td>
  </tr>`;
      })
      .join("");

    const tableHtml = `<div class="report-block">
<table>
  <tr>
    <td class="title" colspan="2">${month}</td>
    ${weekdayCells}
  </tr>
  <tr>
    <td class="label">نفرات</td>
    <td></td>
    ${dateCells}
  </tr>
  <tr>
    <td class="label" colspan="2">ارجمندزاده</td>
    ${mehdiCells}
  </tr>
  <tr>
    <td class="label" colspan="2">مقدسی</td>
    ${hamedCells}
  </tr>
</table>
</div>`;
    const summaryHtml = `<div class="summary-block">
<table class="off-summary">
  <tr>
    <td class="summary-title" colspan="7">گزارش پایان برنامه — ${month}</td>
  </tr>
  <tr>
    <th>نفر</th>
    <th>شیفت روز (صبح)</th>
    <th>پنج‌شنبه کارکرده</th>
    <th>OFF</th>
    <th>آف صبح جمعه/تعطیل رسمی از کل روزهای دوره</th>
    <th>OFF عادی</th>
    <th>OFF پنج‌شنبه</th>
  </tr>
  ${reportSummaryRows}
</table>
</div>`;
    return { tableHtml, summaryHtml };
  }

  function wrapExcelDoc(tablesHtml) {
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>شیفت</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Tahoma, Arial; font-size: 12px; direction: rtl; margin-bottom: 18px; }
  td, th { border: 1px solid #333; padding: 6px 8px; text-align: center; white-space: nowrap; }
  .label { background: #f3f3f3; font-weight: bold; }
  .fri { background: #f4b6b6; }
  .thu { background: #fbd7a0; }
  .company { background: #e4d9ff; }
  .off { background: #c6efce; }
  .off-thursday { background: #ffe699; font-weight: bold; }
  .morning { background: #fff2cc; }
  .night { background: #d9e2f3; }
  .title { font-size: 16px; font-weight: bold; }
  .report-block { margin-bottom: 28px; }
  .off-summary { margin-top: -8px; }
  .summary-title { background: #16324f; color: #fff; font-size: 14px; font-weight: bold; }
  .summary-total { background: #e7eef5; font-weight: bold; }
</style>
</head>
<body>
${tablesHtml}
</body>
</html>`;
  }

  function downloadExcel(html, filename) {
    const blob = new Blob(["\ufeff" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcelHorizontal() {
    const section = buildTableHtml(state.jy, state.jm);
    downloadExcel(
      wrapExcelDoc(section.tableHtml + section.summaryHtml),
      `shifts-${state.jy}-${pad(state.jm)}.xls`
    );
  }

  function exportUntilYearEnd() {
    const targetYear = 1405;
    let jy = state.jy > targetYear ? targetYear : state.jy;
    let jm = state.jy === targetYear ? state.jm : 1;
    const tables = [];
    const summaries = [];
    const pendingCompensations = [];
    while (jy === targetYear) {
      const section = buildTableHtml(jy, jm, pendingCompensations);
      tables.push(section.tableHtml);
      summaries.push(section.summaryHtml);
      const nx = nextMonth(jy, jm);
      jy = nx.jy;
      jm = nx.jm;
    }
    downloadExcel(
      wrapExcelDoc(tables.join("\n") + summaries.join("\n")),
      `shifts-${targetYear}-until-year-end.xls`
    );
  }

  function exportExcelForward() {
    const count = Number(document.getElementById("forwardCount").value) || 6;
    let jy = state.jy;
    let jm = state.jm;
    const tables = [];
    const summaries = [];
    const pendingCompensations = [];
    for (let i = 0; i < count; i += 1) {
      const section = buildTableHtml(jy, jm, pendingCompensations);
      tables.push(section.tableHtml);
      summaries.push(section.summaryHtml);
      const nx = nextMonth(jy, jm);
      jy = nx.jy;
      jm = nx.jm;
    }
    downloadExcel(
      wrapExcelDoc(tables.join("\n") + summaries.join("\n")),
      `shifts-${state.jy}-${pad(state.jm)}-next${count}.xls`
    );
  }

  function initApp() {
    loadState();
    const t = todayJalali();
    state.jy = t.jy;
    state.jm = t.jm;

    document.getElementById("prevMonth").addEventListener("click", () => {
      state.jm -= 1;
      if (state.jm < 1) {
        state.jm = 12;
        state.jy -= 1;
      }
      renderAll();
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
      state.jm += 1;
      if (state.jm > 12) {
        state.jm = 1;
        state.jy += 1;
      }
      renderAll();
    });

    document.getElementById("todayBtn").addEventListener("click", () => {
      const now = todayJalali();
      state.jy = now.jy;
      state.jm = now.jm;
      renderAll();
    });

    document.getElementById("exportBtn").addEventListener("click", exportCsv);
    document.getElementById("exportExcelBtn").addEventListener("click", exportExcelHorizontal);
    document.getElementById("exportForwardBtn").addEventListener("click", exportExcelForward);
    document.getElementById("exportYearEndBtn").addEventListener("click", exportUntilYearEnd);

    document.getElementById("clearOverridesBtn").addEventListener("click", () => {
      if (!requireAdmin()) return;
      const days = buildDays(state.jy, state.jm);
      if (
        !confirm(
          "همه ویرایش‌های دستی همین دوره پاک شود و برنامه فقط با قوانین خودکار ساخته شود؟"
        )
      ) {
        return;
      }
      clearOverridesInDays(days);
      renderAll();
    });

    document.body.addEventListener("change", (e) => {
      const sel = e.target.closest("select.cell-shift");
      if (!sel) return;
      if (!requireAdmin()) {
        renderAll();
        return;
      }
      const dateKey = sel.dataset.date;
      const personId = sel.dataset.person;
      if (!dateKey || !personId) return;
      setCellOverride(dateKey, personId, sel.value);
      renderAll();
    });

    document.getElementById("periodMode").addEventListener("change", (e) => {
      if (!requireAdmin()) return;
      state.periodMode = e.target.checked;
      saveState();
      renderAll();
    });

    document.getElementById("skipHolidays").addEventListener("change", (e) => {
      if (!requireAdmin()) return;
      state.skipHolidays = e.target.checked;
      saveState();
      renderAll();
    });

    document.getElementById("startPerson").addEventListener("change", (e) => {
      if (!requireAdmin()) return;
      state.startPerson = e.target.value;
      saveState();
      renderAll();
    });

    document.getElementById("saveQuotaBtn").addEventListener("click", saveQuotaInputs);
    document.getElementById("saveThursdayBtn").addEventListener("click", saveThursdayCompanyPicker);

    ["totalNormalOff", "totalThursdayOff", "hamedNormalOff", "hamedThursdayOff", "mehdiNormalOff", "mehdiThursdayOff"].forEach(
      (id) => {
        document.getElementById(id).addEventListener("change", saveQuotaInputs);
      }
    );

    document.getElementById("companyForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!requireAdmin()) return;
      const parsed = parseJalaliInput(document.getElementById("companyDate").value);
      const title = document.getElementById("companyTitle").value.trim();
      if (!parsed) {
        alert("تاریخ را مثل 1405/05/25 وارد کنید");
        return;
      }
      const date = keyOf(parsed.jy, parsed.jm, parsed.jd);
      if (state.companyHolidays.some((h) => h.date === date && h.title === title)) {
        alert("این مورد قبلاً ثبت شده");
        return;
      }
      state.companyHolidays.push({ date, title });
      saveState();
      e.target.reset();
      renderAll();
    });

    document.getElementById("companyList").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-idx]");
      if (!btn) return;
      if (!requireAdmin()) return;
      const sorted = state.companyHolidays
        .slice()
        .filter((h) => h.title !== COMPANY_THURSDAY_TITLE)
        .sort((a, b) => a.date.localeCompare(b.date));
      const item = sorted[Number(btn.dataset.idx)];
      if (!item) return;
      state.companyHolidays = state.companyHolidays.filter(
        (h) => !(h.date === item.date && h.title === item.title)
      );
      saveState();
      renderAll();
    });

    renderAll();
  }

  initAuth();
})();
