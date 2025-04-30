function toggleTheme() {
	document.body.classList.toggle("dark");
}

document.addEventListener("DOMContentLoaded", () => {
	const overlay = document.getElementById("overlay");
	const audio = document.getElementById("bg-audio");

	const allSongs = [
		"song1.mp3", "song2.flac", "song3.flac", "song4.flac", "song5.flac",
		"song6.flac", "song7.flac", "song8.mp3", "song9.flac", "song10.mp3",
		"song11.flac", "song12.flac", "song13.flac", "song14.flac", "song15.mp3"
	];

	let songBag = [];

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
		audio.play().catch(err => console.error("Audio play error:", err));
	}

	overlay.addEventListener("click", () => {
		overlay.style.display = "none";
		audio.muted = false;
		playNextSong();
	});

	audio.addEventListener("ended", playNextSong);

	refillBag();

	fetch("https://lastplayed.prigoana.com/eduardprigoana/")
		.then(response => response.json())
		.then(data => {
			const track = data.track;
			const name = track.name;
			const artist = track.artist["#text"];
			const album = track.album["#text"];
			const image = track.image.find(img => img.size === "extralarge")?.["#text"] || "";
			const url = track.url;

			document.getElementById("now-playing").innerHTML = `
        <a href="${url}">
          <p><strong>${name}</strong> by <strong>${artist}</strong></p>
          <p><strong>${album}</strong></p>
          ${image ? `<img src="${image}" alt="${name}" style="max-width:150px;">` : ""}
        </a>
      `;
		})
		.catch(error => {
			document.getElementById("now-playing").textContent = "Could not load now playing info.";
			console.error("Now playing fetch error:", error);
		});
});