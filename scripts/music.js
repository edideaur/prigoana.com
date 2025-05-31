// music.js
document.addEventListener("DOMContentLoaded", () => {
	const audio = document.getElementById("bg-audio");
	const playToggle = document.getElementById("play-toggle");

	const allSongs = [
		"song1.mp3", "song2.flac", "song3.flac", "song4.flac", "song5.flac",
		"song6.flac", "song7.flac", "song8.mp3", "song9.flac", "song10.mp3",
		"song11.flac", "song12.flac", "song13.flac", "song14.flac", "song15.mp3"
	];

	let songBag = [];
	let isPlaying = false;
	let initialized = false;

	function refillBag() {
		songBag = [...allSongs];
		for (let i = songBag.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[songBag[i], songBag[j]] = [songBag[j], songBag[i]];
		}
	}

	function playNextSong() {
		if (songBag.length === 0) refillBag();
		const nextSong = songBag.pop();
		audio.src = `./music/${nextSong}`;
		audio.load();
		audio.oncanplaythrough = () => {
			audio.play().catch(err => console.error("Audio play error:", err));
		};
	}

	playToggle.addEventListener("click", () => {
		if (!initialized) {
			audio.muted = false;
			refillBag();
			playNextSong();
			initialized = true;
			isPlaying = true;
			playToggle.textContent = "Pause";
		} else {
			if (isPlaying) {
				audio.pause();
				playToggle.textContent = "Play";
			} else {
				audio.play().catch(err => console.error("Audio resume error:", err));
				playToggle.textContent = "Pause";
			}
			isPlaying = !isPlaying;
		}
	});

	audio.addEventListener("ended", playNextSong);
});
