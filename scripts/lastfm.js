// lastfm.js
document.addEventListener("DOMContentLoaded", () => {
	fetch("https://lastplayed.prigoana.com/eduardprigoana/")
		.then(response => response.json())
		.then(data => {
			const track = data.track;
			const name = track.name;
			const artist = track.artist["#text"];
			const album = track.album["#text"];
			const image = track.image.find(img => img.size === "extralarge")?.["#text"] || "";
			const url = track.url;
			const uts = track.date?.uts;

			let playedInfo = "";
			if (uts) {
				const playedDate = new Date(uts * 1000);
				const now = new Date();
				const diffMs = now - playedDate;
				const diffMins = Math.floor(diffMs / 60000);
				const hours = Math.floor(diffMins / 60);
				const minutes = diffMins % 60;

				const formattedTime = playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

				if (hours === 0) {
					playedInfo = `<p>at ${formattedTime}, ${minutes} minute${minutes !== 1 ? 's' : ''} ago</p>`;
				} else {
					playedInfo = `<p>at ${formattedTime}, ${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} ago</p>`;
				}
			} else {
				playedInfo = `<p><em>Now playing</em></p>`;
			}

			document.getElementById("now-playing").innerHTML = `
				<a href="${url}">
					<p><strong>${name}</strong> by <strong>${artist}</strong></p>
					<p><strong>${album}</strong></p>
					${image ? `<img src="${image}" alt="${name}" style="max-width:235px;">` : ""}
					${playedInfo}
				</a>
			`;
		})
		.catch(error => {
			document.getElementById("now-playing").textContent = "Could not load now playing info.";
			console.error("Now playing fetch error:", error);
		});
});
