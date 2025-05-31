const instructions = {
	android: `
	  <h2>Android</h2>
	  <ul>
		<li>Go to <strong>Settings → Network & internet → Advanced → Private DNS</strong>.</li>
		<li>Select <strong>Private DNS provider hostname</strong>.</li>
		<li>Enter <code>7af1b9.dns.nextdns.io</code> and tap Save.</li>
	  </ul>
	`,
	ios: `
	  <h2>iOS</h2>
	  <p>Use the <a href="https://apple.nextdns.io" target="_blank">Apple Configuration Profile Generator</a>.</p>
	  <h3>Using the NextDNS App</h3>
	  <ul>
		<li>Install the <strong>NextDNS app</strong> from the App Store.</li>
		<li>In Settings, enable <strong>Use Custom Configuration</strong> and enter <code>7af1b9</code>.</li>
		<li>Enable NextDNS.</li>
	  </ul>
	`,
	windows: `
	  <h2>Windows</h2>
	  <h3>DNS over HTTPS (Windows 11)</h3>
	  <ul>
		<li>Open <strong>Settings → Network & Internet</strong>.</li>
		<li>Click Wi-Fi or Ethernet, then <strong>Hardware properties</strong>.</li>
		<li>Edit DNS server assignment: use <code>45.90.28.0</code> and <code>45.90.30.0</code> with <code>https://dns.nextdns.io/7af1b9</code>.</li>
	  </ul>

	  <h3>NextDNS App</h3>
	  <ul>
		<li>Download and install the app.</li>
		<li>In Settings, set Configuration ID to <code>7af1b9</code>.</li>
		<li>Enable NextDNS from the system tray.</li>
	  </ul>

	  <h3>IPv4 / IPv6 Settings</h3>
	  <p>Manual configuration can also be done via Network Settings with the following servers:</p>
	  <ul>
		<li><strong>IPv6:</strong> <code>2a07:a8c0::7a:f1b9</code>, <code>2a07:a8c1::7a:f1b9</code></li>
		<li><strong>IPv4 (Linked IP):</strong> <code>45.90.28.84</code>, <code>45.90.30.84</code></li>
	  </ul>
	`,
	macos: `
	  <h2>macOS</h2>
	  <p>Use the <a href="https://apple.nextdns.io" target="_blank">Apple Configuration Profile Generator</a>.</p>
	  <h3>NextDNS App</h3>
	  <ul>
		<li>Install from the Mac App Store.</li>
		<li>Set Configuration ID to <code>7af1b9</code>.</li>
		<li>Enable NextDNS in Preferences.</li>
	  </ul>
	  <h3>Manual Configuration</h3>
	  <p>Set DNS servers to:</p>
	  <ul>
		<li><strong>IPv6:</strong> <code>2a07:a8c0::7a:f1b9</code>, <code>2a07:a8c1::7a:f1b9</code></li>
		<li><strong>IPv4 (Linked IP):</strong> <code>45.90.28.84</code>, <code>45.90.30.84</code></li>
	  </ul>
	`,
	linux: `
	  <h2>Linux</h2>
	  <h3>systemd-resolved</h3>
	  <p>Edit <code>/etc/systemd/resolved.conf</code> with:</p>
	  <pre><code>[Resolve]
DNS=45.90.28.0#7af1b9.dns.nextdns.io
DNS=2a07:a8c0::#7af1b9.dns.nextdns.io
DNSOverTLS=yes</code></pre>
	  <h3>NextDNS CLI</h3>
	  <p>Run:</p>
	  <pre><code>sh -c "$(curl -sL https://nextdns.io/install)"</code></pre>
	  <h3>IPv4 / IPv6</h3>
	  <ul>
		<li><code>45.90.28.84</code>, <code>45.90.30.84</code></li>
		<li><code>2a07:a8c0::7a:f1b9</code>, <code>2a07:a8c1::7a:f1b9</code></li>
	  </ul>
	`,
	chromeos: `
	  <h2>ChromeOS</h2>
	  <ul>
		<li>Go to <strong>Settings → Security and Privacy</strong>.</li>
		<li>Enable <strong>Use secure DNS</strong>.</li>
		<li>Use custom DNS: <code>https://dns.nextdns.io/7af1b9</code></li>
	  </ul>
	`,
	browsers: `
	  <h2>Browser Setup</h2>
	  <h3>Chrome / Brave / Edge</h3>
	  <ul>
		<li>Go to <strong>Settings → Privacy & Security → Security</strong>.</li>
		<li>Enable <strong>Use secure DNS</strong> with custom provider: <code>https://dns.nextdns.io/7af1b9</code></li>
	  </ul>
	  <h3>Firefox</h3>
	  <ul>
		<li>Go to <strong>Preferences → Privacy & Security</strong>.</li>
		<li>Enable <strong>DNS over HTTPS</strong>, choose <strong>Custom</strong> and enter <code>https://dns.nextdns.io/7af1b9</code></li>
	  </ul>
	`,
	routers: `
	  <h2>Router Configuration</h2>
	  <ul>
		<li>Access your router settings via browser (e.g. <code>http://192.168.1.1</code>).</li>
		<li>Set DNS servers to:
		  <ul>
			<li>IPv6: <code>2a07:a8c0::7a:f1b9</code>, <code>2a07:a8c1::7a:f1b9</code></li>
			<li>IPv4: <code>45.90.28.84</code>, <code>45.90.30.84</code></li>
		  </ul>
		</li>
	  </ul>
	  <p>More advanced setup at: <a href="https://github.com/nextdns/nextdns/wiki" target="_blank">NextDNS Wiki</a></p>
	`,
	pfsense: `
	  <h2>pfSense</h2>
	  <ol>
		<li>Go to <strong>Services → DNS Resolver</strong>.</li>
		<li>Scroll to <strong>Custom Options</strong> and add:</li>
	  </ol>
	  <pre><code>server:
forward-zone:
  name: "."
  forward-tls-upstream: yes
  forward-addr: 45.90.28.0#7af1b9.dns.nextdns.io
  forward-addr: 2a07:a8c0::#7af1b9.dns.nextdns.io</code></pre>
	`,
	mikrotik: `
	  <h2>MikroTik</h2>
	  <ol>
		<li>Fetch CA cert: <code>/tool fetch url=https://curl.se/ca/cacert.pem</code></li>
		<li>Import cert: <code>/certificate import file-name=cacert.pem</code></li>
		<li>Configure DNS:
		  <pre><code>/ip dns static add name=dns.nextdns.io address=45.90.28.0 type=A
/ip dns set use-doh-server="https://dns.nextdns.io/7af1b9" verify-doh-cert=yes</code></pre>
		</li>
	  </ol>
	`
  };

  const selectElement = document.getElementById("device-select");
  const instructionsBox = document.getElementById("instructions");

  selectElement.addEventListener("change", (event) => {
	const selected = event.target.value;
	if (selected && instructions[selected]) {
	  instructionsBox.innerHTML = instructions[selected];
	  instructionsBox.style.display = "block";
	} else {
	  instructionsBox.style.display = "none";
	  instructionsBox.innerHTML = "";
	}
  });