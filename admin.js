document.addEventListener("DOMContentLoaded", () => {
    // PASSCODE GATING
    const ADMIN_PASSCODE = "admin123";
    let isAuthenticated = false;

    const loginGate = document.getElementById("loginGate");
    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById("password");
    const loginError = document.getElementById("loginError");
    const adminDashboard = document.getElementById("adminDashboard");

    const checkAuth = () => {
        if (isAuthenticated) {
            loginGate.style.display = "none";
            adminDashboard.style.display = "flex";
            initializeDashboard();
        } else {
            loginGate.style.display = "flex";
            adminDashboard.style.display = "none";
        }
    };

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (passwordInput.value === ADMIN_PASSCODE) {
                isAuthenticated = true;
                loginError.textContent = "";
                checkAuth();
            } else {
                loginError.textContent = "Incorrect passcode. Please try again.";
                passwordInput.value = "";
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            isAuthenticated = false;
            checkAuth();
        });
    }

    // TAB SELECTIONS
    const menuItems = document.querySelectorAll(".menu-item");
    const tabContents = document.querySelectorAll(".tab-content");

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            menuItems.forEach(mi => mi.classList.remove("active"));
            item.classList.add("active");

            tabContents.forEach(tc => {
                tc.classList.remove("active");
                if (tc.getAttribute("id") === targetTab) {
                    tc.classList.add("active");
                }
            });

            if (targetTab === "dashboard-view" || targetTab === "bookings-view") {
                loadBookings();
            } else if (targetTab === "blocklist-view") {
                loadBlocklist();
            } else if (targetTab === "settings-view") {
                loadSettings();
            }
        });
    });

    // TOAST UTILITY
    const showToast = (message) => {
        const toast = document.getElementById("adminToast");
        if (toast) {
            toast.textContent = message;
            toast.classList.add("show");
            setTimeout(() => {
                toast.classList.remove("show");
            }, 3000);
        }
    };

    // DASHBOARD DATA MANAGERS (SUPABASE CLOUD EXCLUSIVE)
    let blockedTickets = [];
    let cachedBookings = [];

    const initializeDashboard = () => {
        loadBookings();
        loadBlocklist();
        loadSettings();
    };

    // 1. Bookings Manager (EXCLUSIVELY Supabase Cloud Database)
    const loadBookings = async () => {
        let bookings = [];

        // 1. Fetch from Supabase Cloud Database via SDK
        if (window.db && window.db.from) {
            try {
                const { data, error } = await window.db.from("bookings").select("*").order("created_at", { ascending: false });
                if (!error && Array.isArray(data)) {
                    bookings = data;
                }
            } catch (e) {
                console.warn("Supabase SDK fetch error:", e);
            }
        }

        // 2. Fallback PostgREST REST API
        if ((!bookings || bookings.length === 0) && window.SUPABASE_URL) {
            try {
                const res = await fetch(`${window.SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`, {
                    headers: {
                        "apikey": window.SUPABASE_ANON_KEY,
                        "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        bookings = data;
                    }
                }
            } catch (e) {
                console.warn("Supabase PostgREST fetch error:", e);
            }
        }

        if (!Array.isArray(bookings)) bookings = [];
        cachedBookings = bookings;

        try {
            const statTotalBookings = document.getElementById("statTotalBookings");
            if (statTotalBookings) statTotalBookings.textContent = bookings.length;

            const uniquePhones = [...new Set(bookings.map(b => (b && b.phone ? String(b.phone).replace(/[^0-9]/g, '') : '')).filter(p => p.length > 0))];
            const broadcastTargetCount = document.getElementById("broadcastTargetCount");
            if (broadcastTargetCount) broadcastTargetCount.textContent = uniquePhones.length;

            const recentBody = document.getElementById("recentBookingsBody");
            const allBody = document.getElementById("allBookingsBody");

            if (recentBody) {
                recentBody.innerHTML = "";
                if (bookings.length === 0) {
                    recentBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#aaa;">No bookings logged in Supabase yet.</td></tr>`;
                } else {
                    bookings.slice(0, 5).forEach(b => renderRow(recentBody, b));
                }
            }

            if (allBody) {
                allBody.innerHTML = "";
                if (bookings.length === 0) {
                    allBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#aaa;">No customer bookings recorded in Supabase yet. Click "+ Add Manual Customer" to add one manually.</td></tr>`;
                } else {
                    bookings.forEach(b => renderRow(allBody, b));
                }
            }
        } catch (err) {
            console.error("Error rendering booking rows:", err);
        }
    };

    const renderRow = (container, booking) => {
        if (!container || !booking) return;
        const tr = document.createElement("tr");
        
        const numbers = booking.selected_boxes ? String(booking.selected_boxes).split(", ") : [];
        const badgeSpan = numbers.map(num => `<span class="badge-number">${escapeHtml(num)}</span>`).join(" ");
        const timeStr = booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A';
        const defaultMsg = `Hello ${booking.name || 'Customer'}, thank you for booking Kerala Lottery tickets at Om Agency! Selected numbers: ${booking.selected_boxes || 'N/A'}.`;
        const cleanPhone = (booking.phone ? String(booking.phone) : "").replace(/[^0-9]/g, '');
        const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;

        tr.innerHTML = `
            <td>#${booking.id || '-'}</td>
            <td><strong>${escapeHtml(booking.name || 'N/A')}</strong></td>
            <td>${escapeHtml(booking.phone || 'N/A')}</td>
            <td>${badgeSpan || '<em style="color:#777">None</em>'}</td>
            <td>${timeStr}</td>
            <td><a href="${waUrl}" target="_blank" class="btn-whatsapp-row"><i class="fa-brands fa-whatsapp"></i> Chat</a></td>
        `;
        container.appendChild(tr);
    };

    const escapeHtml = (text) => {
        return (text || "")
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // ONE-CLICK CUSTOMER BROADCAST MANAGER
    const sendBroadcastBtn = document.getElementById("sendBroadcastBtn");
    const broadcastModal = document.getElementById("broadcastModal");
    const closeBroadcastModalBtn = document.getElementById("closeBroadcastModalBtn");
    const broadcastMessageText = document.getElementById("broadcastMessageText");
    const broadcastMessagePreview = document.getElementById("broadcastMessagePreview");
    const broadcastCustomerList = document.getElementById("broadcastCustomerList");
    const openAllBroadcastChatsBtn = document.getElementById("openAllBroadcastChatsBtn");

    if (sendBroadcastBtn) {
        sendBroadcastBtn.addEventListener("click", () => {
            const message = broadcastMessageText.value.trim();
            if (!message) {
                alert("Please enter a broadcast message first.");
                return;
            }

            const customerMap = {};
            cachedBookings.forEach(b => {
                const cleanPhone = (b && b.phone ? String(b.phone) : "").replace(/[^0-9]/g, '');
                if (cleanPhone && !customerMap[cleanPhone]) {
                    customerMap[cleanPhone] = b.name || "Customer";
                }
            });

            const uniquePhones = Object.keys(customerMap);

            if (uniquePhones.length === 0) {
                showToast("No registered customer phone numbers found.");
                return;
            }

            if (broadcastMessagePreview) broadcastMessagePreview.textContent = `"${message}"`;
            if (broadcastCustomerList) {
                broadcastCustomerList.innerHTML = "";
                uniquePhones.forEach(phone => {
                    const custName = customerMap[phone];
                    const item = document.createElement("div");
                    item.classList.add("broadcast-customer-item");
                    const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
                    
                    item.innerHTML = `
                        <div class="cust-info">
                            <span class="cust-name">${escapeHtml(custName)}</span>
                            <span class="cust-phone">+91 ${phone}</span>
                        </div>
                        <a href="${waUrl}" target="_blank" class="btn-whatsapp-row"><i class="fa-brands fa-whatsapp"></i> Send WhatsApp</a>
                    `;
                    broadcastCustomerList.appendChild(item);
                });
            }

            if (broadcastModal) broadcastModal.style.display = "flex";
        });
    }

    if (closeBroadcastModalBtn) {
        closeBroadcastModalBtn.addEventListener("click", () => {
            if (broadcastModal) broadcastModal.style.display = "none";
        });
    }

    if (openAllBroadcastChatsBtn) {
        openAllBroadcastChatsBtn.addEventListener("click", () => {
            const message = broadcastMessageText.value.trim();
            const customerMap = {};
            cachedBookings.forEach(b => {
                const cleanPhone = (b && b.phone ? String(b.phone) : "").replace(/[^0-9]/g, '');
                if (cleanPhone && !customerMap[cleanPhone]) {
                    customerMap[cleanPhone] = b.name || "Customer";
                }
            });

            const uniquePhones = Object.keys(customerMap);
            if (uniquePhones.length === 0) return;

            uniquePhones.forEach((phone, idx) => {
                setTimeout(() => {
                    const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
                    window.open(waUrl, "_blank");
                }, idx * 600);
            });

            showToast(`Launching broadcast chats for ${uniquePhones.length} customers...`);
        });
    }

    // 2. Blocklist Manager (EXCLUSIVELY Supabase Cloud)
    const loadBlocklist = async () => {
        try {
            let blockData = null;
            if (window.db && window.db.from) {
                const { data, error } = await window.db.from("blocklist").select("*").eq("id", 1).single();
                if (!error && data) blockData = data;
            }

            if (!blockData && window.SUPABASE_URL) {
                const res = await fetch(`${window.SUPABASE_URL}/rest/v1/blocklist?id=eq.1&select=*`, {
                    headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` }
                });
                if (res.ok) {
                    const arr = await res.json();
                    if (arr && arr.length > 0) blockData = arr[0];
                }
            }

            if (blockData) {
                blockedTickets = blockData.blocked_numbers || [];
            }

            const statBlockedNumbers = document.getElementById("statBlockedNumbers");
            if (statBlockedNumbers) statBlockedNumbers.textContent = blockedTickets.length;

            const gridContainer = document.getElementById("adminInventoryGrid");
            if (gridContainer) {
                gridContainer.innerHTML = "";
                for (let i = 1; i <= 100; i++) {
                    const box = document.createElement("div");
                    box.classList.add("admin-box");
                    box.textContent = i.toString().padStart(2, '0');
                    
                    if (blockedTickets.includes(i)) {
                        box.classList.add("blocked");
                    }

                    box.addEventListener("click", () => {
                        if (blockedTickets.includes(i)) {
                            blockedTickets = blockedTickets.filter(n => n !== i);
                            box.classList.remove("blocked");
                        } else {
                            blockedTickets.push(i);
                            box.classList.add("blocked");
                        }
                    });

                    gridContainer.appendChild(box);
                }
            }
        } catch (err) {
            console.error("Error loading blocklist from Supabase:", err);
        }
    };

    const saveBlocklistBtn = document.getElementById("saveBlocklistBtn");
    if (saveBlocklistBtn) {
        saveBlocklistBtn.addEventListener("click", async () => {
            try {
                let saved = false;
                if (window.db && window.db.from) {
                    const { error } = await window.db.from("blocklist").update({ blocked_numbers: blockedTickets, updated_at: new Date() }).eq("id", 1);
                    if (!error) saved = true;
                }

                if (!saved && window.SUPABASE_URL) {
                    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/blocklist?id=eq.1`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` },
                        body: JSON.stringify({ blocked_numbers: blockedTickets, updated_at: new Date() })
                    });
                    if (res.ok) saved = true;
                }

                if (saved) {
                    showToast("Blocked ending numbers saved to Supabase!");
                    const statBlockedNumbers = document.getElementById("statBlockedNumbers");
                    if (statBlockedNumbers) statBlockedNumbers.textContent = blockedTickets.length;
                } else {
                    showToast("Failed to save blocklist in Supabase.");
                }
            } catch (err) {
                console.error("Error saving blocklist to Supabase:", err);
            }
        });
    }

    // 3. Settings & CMS Manager (EXCLUSIVELY Supabase Cloud)
    const loadSettings = async () => {
        try {
            let settings = null;
            if (window.db && window.db.from) {
                const { data, error } = await window.db.from("settings").select("*").eq("id", 1).single();
                if (!error && data) settings = data;
            }

            if (!settings && window.SUPABASE_URL) {
                const res = await fetch(`${window.SUPABASE_URL}/rest/v1/settings?id=eq.1&select=*`, {
                    headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` }
                });
                if (res.ok) {
                    const arr = await res.json();
                    if (arr && arr.length > 0) settings = arr[0];
                }
            }

            if (settings) {
                const statHotline = document.getElementById("statHotline");
                if (statHotline) statHotline.textContent = `+91 ${settings.whatsapp_phone || '6382483801'}`;

                const statPageViews = document.getElementById("statPageViews");
                if (statPageViews) statPageViews.textContent = (settings.page_views || 0).toLocaleString();

                const settingsWhatsapp = document.getElementById("settingsWhatsapp");
                const settingsMarquee = document.getElementById("settingsMarquee");
                const cmsHeroBadge = document.getElementById("cmsHeroBadge");
                const cmsHeroHeading = document.getElementById("cmsHeroHeading");
                const cmsHeroSubtitle = document.getElementById("cmsHeroSubtitle");
                const cmsTodayDrawName = document.getElementById("cmsTodayDrawName");
                const cmsTicketPrice = document.getElementById("cmsTicketPrice");
                const cmsFirstPrize = document.getElementById("cmsFirstPrize");
                const cmsDrawTime = document.getElementById("cmsDrawTime");
                const cmsBumperTitle = document.getElementById("cmsBumperTitle");
                const cmsBumperPrize = document.getElementById("cmsBumperPrize");
                const cmsImgLogo = document.getElementById("cmsImgLogo");
                const cmsImgHero = document.getElementById("cmsImgHero");
                const cmsImgPromo = document.getElementById("cmsImgPromo");
                const cmsImgWhy = document.getElementById("cmsImgWhy");
                const settingsMetaPixel = document.getElementById("settingsMetaPixel");
                const settingsMetaVerification = document.getElementById("settingsMetaVerification");

                if (settingsWhatsapp) settingsWhatsapp.value = settings.whatsapp_phone || "";
                if (settingsMarquee) settingsMarquee.value = settings.marquee_text || "";
                if (cmsHeroBadge) cmsHeroBadge.value = settings.hero_badge || "";
                if (cmsHeroHeading) cmsHeroHeading.value = settings.hero_heading || "";
                if (cmsHeroSubtitle) cmsHeroSubtitle.value = settings.hero_subtitle || "";
                if (cmsTodayDrawName) cmsTodayDrawName.value = settings.today_draw_name || "";
                if (cmsTicketPrice) cmsTicketPrice.value = settings.ticket_price || "";
                if (cmsFirstPrize) cmsFirstPrize.value = settings.first_prize || "";
                if (cmsDrawTime) cmsDrawTime.value = settings.draw_time || "";
                if (cmsBumperTitle) cmsBumperTitle.value = settings.bumper_title || "";
                if (cmsBumperPrize) cmsBumperPrize.value = settings.bumper_prize || "";
                if (cmsImgLogo) cmsImgLogo.value = settings.img_logo || "assets/logo.jpg";
                if (cmsImgHero) cmsImgHero.value = settings.img_hero || "assets/logo.jpg";
                if (cmsImgPromo) cmsImgPromo.value = settings.img_promo || "assets/promo_tickets.webp";
                if (cmsImgWhy) cmsImgWhy.value = settings.img_why || "assets/why_choose_us.webp";
                if (settingsMetaPixel) settingsMetaPixel.value = settings.meta_pixel_id || "";
                if (settingsMetaVerification) settingsMetaVerification.value = settings.meta_domain_verification || "";
            }
        } catch (err) {
            console.error("Error loading settings from Supabase:", err);
        }
    };

    const adminSettingsForm = document.getElementById("adminSettingsForm");
    if (adminSettingsForm) {
        adminSettingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const phone = document.getElementById("settingsWhatsapp").value.trim();
            const marquee = document.getElementById("settingsMarquee").value.trim();
            const heroBadge = document.getElementById("cmsHeroBadge").value.trim();
            const heroHeading = document.getElementById("cmsHeroHeading").value.trim();
            const heroSubtitle = document.getElementById("cmsHeroSubtitle").value.trim();
            const todayDrawName = document.getElementById("cmsTodayDrawName").value.trim();
            const ticketPrice = document.getElementById("cmsTicketPrice").value.trim();
            const firstPrize = document.getElementById("cmsFirstPrize").value.trim();
            const drawTime = document.getElementById("cmsDrawTime").value.trim();
            const bumperTitle = document.getElementById("cmsBumperTitle").value.trim();
            const bumperPrize = document.getElementById("cmsBumperPrize").value.trim();
            const imgLogo = document.getElementById("cmsImgLogo").value.trim();
            const imgHero = document.getElementById("cmsImgHero").value.trim();
            const imgPromo = document.getElementById("cmsImgPromo").value.trim();
            const imgWhy = document.getElementById("cmsImgWhy").value.trim();
            const pixel = document.getElementById("settingsMetaPixel").value.trim();
            const verification = document.getElementById("settingsMetaVerification").value.trim();

            const settingsData = {
                whatsapp_phone: phone,
                marquee_text: marquee,
                hero_badge: heroBadge,
                hero_heading: heroHeading,
                hero_subtitle: heroSubtitle,
                today_draw_name: todayDrawName,
                ticket_price: ticketPrice,
                first_prize: firstPrize,
                draw_time: drawTime,
                bumper_title: bumperTitle,
                bumper_prize: bumperPrize,
                img_logo: imgLogo,
                img_hero: imgHero,
                img_promo: imgPromo,
                img_why: imgWhy,
                meta_pixel_id: pixel,
                meta_domain_verification: verification
            };

            try {
                let saved = false;
                if (window.db && window.db.from) {
                    const { error } = await window.db.from("settings").update({
                        ...settingsData,
                        updated_at: new Date()
                    }).eq("id", 1);
                    if (!error) saved = true;
                }

                if (!saved && window.SUPABASE_URL) {
                    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` },
                        body: JSON.stringify(settingsData)
                    });
                    if (res.ok) saved = true;
                }

                if (saved) {
                    showToast("All site content & settings saved to Supabase!");
                    const statHotline = document.getElementById("statHotline");
                    if (statHotline) statHotline.textContent = `+91 ${phone}`;
                } else {
                    showToast("Failed to save settings in Supabase.");
                }
            } catch (err) {
                console.error("Error saving settings to Supabase:", err);
            }
        });
    }

    // MANUAL CUSTOMER ADDITION HANDLERS (EXCLUSIVELY Supabase Cloud)
    const manualCustomerForm = document.getElementById("manualCustomerForm");
    const addCustomerModal = document.getElementById("addCustomerModal");
    const openAddCustomerModalBtn = document.getElementById("openAddCustomerModalBtn");
    const closeAddCustomerModalBtn = document.getElementById("closeAddCustomerModalBtn");

    if (openAddCustomerModalBtn) {
        openAddCustomerModalBtn.addEventListener("click", () => {
            if (addCustomerModal) addCustomerModal.style.display = "flex";
        });
    }

    if (closeAddCustomerModalBtn) {
        closeAddCustomerModalBtn.addEventListener("click", () => {
            if (addCustomerModal) addCustomerModal.style.display = "none";
        });
    }

    if (manualCustomerForm) {
        manualCustomerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("manualName").value.trim();
            const phone = document.getElementById("manualPhone").value.trim();
            const selectedBoxes = document.getElementById("manualSelectedBoxes").value.trim();

            if (!name || !phone) {
                alert("Please enter customer name and phone number.");
                return;
            }

            try {
                let saved = false;
                if (window.db && window.db.from) {
                    const { error } = await window.db.from("bookings").insert([{ name: name, phone: phone, selected_boxes: selectedBoxes || "General Booking" }]);
                    if (!error) saved = true;
                }

                if (!saved && window.SUPABASE_URL) {
                    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/bookings`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`, "Prefer": "return=minimal" },
                        body: JSON.stringify([{ name: name, phone: phone, selected_boxes: selectedBoxes || "General Booking" }])
                    });
                    if (res.ok) saved = true;
                }

                if (saved) {
                    showToast("Customer added manually to Supabase Database!");
                    manualCustomerForm.reset();
                    if (addCustomerModal) addCustomerModal.style.display = "none";
                    loadBookings();
                } else {
                    showToast("Failed to save customer to Supabase.");
                }
            } catch (err) {
                console.error("Error saving manual customer to Supabase:", err);
            }
        });
    }

    const refreshBookingsBtn = document.getElementById("refreshBookingsBtn");
    if (refreshBookingsBtn) {
        refreshBookingsBtn.addEventListener("click", () => {
            loadBookings();
            showToast("Booking logs refreshed from Supabase!");
        });
    }

    setInterval(() => {
        if (isAuthenticated) {
            loadBookings();
        }
    }, 2000);

    if (window.db && window.db.channel) {
        try {
            window.db.channel('public:bookings')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, payload => {
                    if (isAuthenticated) {
                        showToast(`New live booking from ${payload.new.name || 'Customer'}!`);
                        loadBookings();
                    }
                })
                .subscribe();
        } catch (e) {
            console.error("Realtime subscription error:", e);
        }
    }

    checkAuth();
});
