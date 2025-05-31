// theme.js

const ENV = window.location.hostname === "localhost" ? "dev" : "prod";
const COOKIE_DOMAIN = ENV === "dev" ? "localhost" : ".prigoana.com";

function setCookie(name, value, days = 365) {
	const expires = new Date(Date.now() + days * 864e5).toUTCString();
	document.cookie = `${name}=${value}; expires=${expires}; path=/; domain=${COOKIE_DOMAIN}; SameSite=Lax`;
}

function getCookie(name) {
	return document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1];
}

function applyTheme(theme) {
	document.body.classList.toggle("dark", theme === "dark");
	document.body.classList.toggle("light", theme === "light");
	setCookie("theme", theme);
}

function getSystemPreference() {
	return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initTheme() {
	const savedTheme = getCookie("theme");
	const themeToApply = savedTheme || getSystemPreference() || "dark";
	applyTheme(themeToApply);
}

function toggleTheme() {
	const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";
	const newTheme = currentTheme === "dark" ? "light" : "dark";
	applyTheme(newTheme);
}

// Initialize theme on page load
document.addEventListener("DOMContentLoaded", initTheme);
