document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");

    if (menuToggle && navMenu) {
        menuToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });

        const navLinks = navMenu.querySelectorAll(".navigation a");
        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                navMenu.classList.remove("active");
            });
        });
    }

    let destinationPhone = "6382483801";
    let blockedTickets = [];

    // --- Load Configuration & Blocklist EXCLUSIVELY from Supabase Cloud ---
    const loadConfig = async () => {
        // 1. Increment page views counter in Supabase
        try {
            if (window.db && window.db.rpc) {
                await window.db.rpc("increment_page_views");
            }
        } catch (err) {
            console.error("Error incrementing page views in Supabase:", err);
        }

        // 2. Load Settings EXCLUSIVELY from Supabase
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
                destinationPhone = settings.whatsapp_phone || "6382483801";
                
                const marquee1 = document.getElementById("marquee-span-1");
                const marquee2 = document.getElementById("marquee-span-2");
                const navBtn = document.getElementById("nav-contact-btn");
                const heroBtn = document.getElementById("hero-whatsapp-btn");
                const promoBtn = document.getElementById("promo-contact-btn");
                const footerPhoneText = document.getElementById("footer-phone-text");

                const cmsHeroBadge = document.getElementById("cms-hero-badge");
                const cmsHeroTitle = document.getElementById("cms-hero-title");
                const cmsHeroSubtitle = document.getElementById("cms-hero-subtitle");

                const cmsHeaderLogoImg = document.getElementById("cms-header-logo-img");
                const cmsHeroImg = document.getElementById("cms-hero-img");
                const cmsPromoImg = document.getElementById("cms-promo-img");
                const cmsWhyImg = document.getElementById("cms-why-img");

                if (marquee1 && settings.marquee_text) marquee1.textContent = settings.marquee_text;
                if (marquee2 && settings.marquee_text) marquee2.textContent = settings.marquee_text;
                if (navBtn) navBtn.setAttribute("href", `https://wa.me/91${destinationPhone}`);
                if (heroBtn) heroBtn.setAttribute("href", `https://wa.me/91${destinationPhone}`);
                if (promoBtn) promoBtn.setAttribute("href", `https://wa.me/91${destinationPhone}`);
                if (footerPhoneText) footerPhoneText.textContent = destinationPhone;

                if (cmsHeroBadge && settings.hero_badge) {
                    cmsHeroBadge.innerHTML = `<span class="pulse-dot"></span> ${settings.hero_badge}`;
                }
                if (cmsHeroTitle && settings.hero_heading) {
                    cmsHeroTitle.innerHTML = settings.hero_heading;
                }
                if (cmsHeroSubtitle && settings.hero_subtitle) {
                    cmsHeroSubtitle.textContent = settings.hero_subtitle;
                }

                // Dynamic Image Binds from Supabase
                if (cmsHeaderLogoImg && settings.img_logo) cmsHeaderLogoImg.src = settings.img_logo;
                if (cmsHeroImg && settings.img_hero) cmsHeroImg.src = settings.img_hero;
                if (cmsPromoImg && settings.img_promo) cmsPromoImg.src = settings.img_promo;
                if (cmsWhyImg && settings.img_why) cmsWhyImg.src = settings.img_why;

                if (settings.meta_domain_verification) {
                    let metaVerify = document.querySelector('meta[name="facebook-domain-verification"]');
                    if (!metaVerify) {
                        metaVerify = document.createElement('meta');
                        metaVerify.setAttribute('name', 'facebook-domain-verification');
                        document.head.appendChild(metaVerify);
                    }
                    metaVerify.setAttribute('content', settings.meta_domain_verification);
                }

                if (settings.meta_pixel_id) {
                    if (!window.fbq) {
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window,document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        
                        fbq('init', settings.meta_pixel_id);
                        fbq('track', 'PageView');
                    }
                }
            }
        } catch (err) {
            console.error("Error loading settings from Supabase:", err);
        }

        // 3. Load Blocklist EXCLUSIVELY from Supabase
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
        } catch (err) {
            console.error("Error loading blocklist from Supabase:", err);
        }

        buildGrid();
    };

    const form = document.getElementById("contact-form");
    const selectedBoxesInput = document.getElementById("selected-boxes");
    const lotteryContainer = document.getElementById("lotteryGridContainer");
    const ticketNumbersGrid = document.getElementById("ticketNumbersGrid");
    let selectedNumbers = [];

    if (selectedBoxesInput && lotteryContainer) {
        selectedBoxesInput.addEventListener("click", () => {
            lotteryContainer.classList.add("open");
        });
    }

    const buildGrid = () => {
        if (!ticketNumbersGrid) return;
        ticketNumbersGrid.innerHTML = "";

        for (let i = 1; i <= 100; i++) {
            const box = document.createElement("div");
            box.className = "box";
            
            const boxNumStr = i.toString().padStart(2, '0');
            box.textContent = boxNumStr;
            
            if (blockedTickets.includes(i)) {
                box.classList.add("sold-out");
            }
            
            box.addEventListener("click", () => {
                if (box.classList.contains("sold-out")) return;

                if (selectedNumbers.includes(boxNumStr)) {
                    selectedNumbers = selectedNumbers.filter((num) => num !== boxNumStr);
                    box.classList.remove("selected");
                } else {
                    selectedNumbers.push(boxNumStr);
                    box.classList.add("selected");
                }
                
                selectedNumbers.sort((a, b) => parseInt(a) - parseInt(b));
                selectedBoxesInput.value = selectedNumbers.join(", ");
            });
            
            ticketNumbersGrid.appendChild(box);
        }
    };

    loadConfig();

    // --- Submit Booking EXCLUSIVELY to Supabase Cloud Database ---
    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            
            const submitBtn = form.querySelector("button[type='submit']");
            const originalBtnText = submitBtn ? submitBtn.innerHTML : "Submit";

            const nameInput = document.getElementById("name");
            const phoneInput = document.getElementById("phone");
            
            const name = nameInput ? nameInput.value.trim() : "";
            const phone = phoneInput ? phoneInput.value.trim() : "";
            let selectedBoxes = selectedBoxesInput ? selectedBoxesInput.value.trim() : "";
            
            if (!name || !phone) {
                alert("Please enter your Name and Phone Number.");
                return;
            }

            if (!selectedBoxes || selectedBoxes === "No boxes selected") {
                selectedBoxes = "General Booking";
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving to Supabase Admin...`;
            }

            try {
                let saved = false;
                if (window.db && window.db.from) {
                    const { error: insertError } = await window.db.from("bookings").insert([{
                        name: name,
                        phone: phone,
                        selected_boxes: selectedBoxes
                    }]);
                    if (!insertError) saved = true;
                }

                if (!saved && window.SUPABASE_URL) {
                    const postRes = await fetch(`${window.SUPABASE_URL}/rest/v1/bookings`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "apikey": window.SUPABASE_ANON_KEY,
                            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
                            "Prefer": "return=minimal"
                        },
                        body: JSON.stringify([{
                            name: name,
                            phone: phone,
                            selected_boxes: selectedBoxes
                        }])
                    });
                    if (postRes.ok) saved = true;
                }

                console.log("Supabase Cloud insert completed. Success:", saved);
            } catch (err) {
                console.error("Error saving booking to Supabase:", err);
            }
            
            if (window.fbq) {
                try {
                    fbq('track', 'Lead', {
                        content_name: 'Kerala Lottery Ticket Booking',
                        value: (selectedBoxes !== "General Booking") ? selectedBoxes.split(", ").length * 40 : 40,
                        currency: 'INR'
                    });
                } catch (e) {}
            }
            
            form.reset();
            selectedNumbers = [];
            if (ticketNumbersGrid) {
                const boxes = ticketNumbersGrid.querySelectorAll(".box");
                boxes.forEach(box => box.classList.remove("selected"));
            }
            if (lotteryContainer) {
                lotteryContainer.classList.remove("open");
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }

            const whatsappLink = `https://api.whatsapp.com/send?phone=+91${destinationPhone}&text=${encodeURIComponent(`Name: ${name}\nPhone: ${phone}\nSelected Numbers: ${selectedBoxes}`)}`;
            window.open(whatsappLink, "_blank");
        });
    }

    const accordionItems = document.querySelectorAll(".accordion-item");
    accordionItems.forEach(item => {
        const header = item.querySelector(".accordion-header");
        header.addEventListener("click", () => {
            const isActive = item.classList.contains("active");
            
            accordionItems.forEach(otherItem => {
                otherItem.classList.remove("active");
                const icon = otherItem.querySelector(".accordion-icon i");
                if (icon) icon.className = "fa-solid fa-chevron-down";
            });

            if (!isActive) {
                item.classList.add("active");
                const icon = item.querySelector(".accordion-icon i");
                if (icon) icon.className = "fa-solid fa-chevron-up";
            }
        });
    });

    const revealElements = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                }
            });
        }, { threshold: 0.1 });

        revealElements.forEach(el => observer.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add("active"));
    }
});
