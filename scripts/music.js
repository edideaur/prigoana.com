// music.js
document.addEventListener("DOMContentLoaded", () => {
	const audio = document.getElementById("bg-audio");
	const playToggle = document.getElementById("play-toggle");

	let isPlaying = false;
	let initialized = false;
	let currentTrackKey = null; // stores the last loaded key

	async function playSongFromKey(key) {
		console.log("Now playing:", key);
		try {
			const response = await fetch(`https://qobuz.prigoana.com/search/${encodeURIComponent(key)}`);
			if (!response.ok) throw new Error("Track fetch failed");

			const data = await response.json();
			if (!data.url) throw new Error("No URL in response");

			audio.src = data.url;
			audio.load();
			audio.oncanplaythrough = () => {
				audio.play().catch(err => console.error("Audio play error:", err));
			};
			currentTrackKey = key;
		} catch (err) {
			console.error("Error loading track:", err);
		}
	}

	playToggle.addEventListener("click", () => {
		if (typeof lastTrackKey === "undefined") {
			console.error("lastTrackKey is not defined");
			return;
		}

		if (!initialized) {
			audio.muted = false;
			playSongFromKey(lastTrackKey);
			initialized = true;
			isPlaying = true;
			playToggle.textContent = "Pause";
		} else {
			if (isPlaying) {
				audio.pause();
				playToggle.textContent = "Play";
			} else {
				// Check if lastTrackKey has changed
				if (lastTrackKey !== currentTrackKey) {
					playSongFromKey(lastTrackKey);
				} else {
					audio.play().catch(err => console.error("Audio resume error:", err));
				}
				playToggle.textContent = "Pause";
			}
			isPlaying = !isPlaying;
		}
	});

	audio.addEventListener("ended", () => {
		// Optionally re-check lastTrackKey here too
		playSongFromKey(lastTrackKey);
	});
});
