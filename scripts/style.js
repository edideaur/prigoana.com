const title = document.getElementById('glitchText');
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]#%&_<>*+";

const glitchEffect = (target) => {
    const originalText = target.dataset.text || target.innerText;
    let iterations = 0;
    const interval = setInterval(() => {
        target.innerText = originalText.split("")
            .map((letter, index) => {
                if(index < iterations) return originalText[index];
                return chars[Math.floor(Math.random() * chars.length)]
            })
            .join("");

        if(iterations >= originalText.length) clearInterval(interval);
        iterations += 1/3;
    }, 30);
};

if(title) {
    title.addEventListener('mouseover', () => glitchEffect(title));
    setTimeout(() => glitchEffect(title), 500);
}

const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    observer.observe(el);
});

document.querySelectorAll('.highlightable').forEach(codeBlock => {
    codeBlock.addEventListener('click', function() {
        let textToCopy;

        if (this.dataset.copy) {
            textToCopy = this.dataset.copy;
        } else {
            const clone = this.cloneNode(true);
            const feedback = clone.querySelector('.copy-feedback');
            if (feedback) feedback.remove();
            textToCopy = clone.innerText.trim();
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            this.classList.add('copied');
            setTimeout(() => this.classList.remove('copied'), 1500);
        });
    });
});

document.addEventListener('click', (e) => {
    const header = e.target.closest('.crypto-header');
    if (header) {
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.crypto-toggle');
        content.classList.toggle('active');
        toggle.textContent = content.classList.contains('active') ? '[-]' : '[+]';
        return;
    }

    const copyBtn = e.target.closest('[data-action="copy"]');
    if (copyBtn) {
        const address = copyBtn.dataset.address;
        navigator.clipboard.writeText(address).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'COPIED!';
            copyBtn.style.background = 'var(--accent)';
            copyBtn.style.color = '#000';
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 1500);
        });
        return;
    }

    const qrBtn = e.target.closest('[data-action="qr"]');
    if (qrBtn) {
        const address = qrBtn.dataset.address;
        const qrContainer = qrBtn.closest('.crypto-content').querySelector('.qr-container');
        if (qrContainer.classList.contains('active')) {
            qrContainer.classList.remove('active');
            qrContainer.innerHTML = '';
            qrBtn.textContent = 'QR CODE';
        } else {
            qrContainer.innerHTML = '';
            qrContainer.classList.add('active');
            new QRCode(qrContainer, {
                text: address,
                width: 200,
                height: 200,
                colorDark: "#ffffff",
                colorLight: "#000000",
            });
            qrBtn.textContent = 'HIDE QR';
        }
        return;
    }
});
