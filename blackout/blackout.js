window.addEventListener('load', function() {
    var targets = document.querySelectorAll('section p');
    [].forEach.call(targets, function(p) {
        var text = p.innerHTML;
        p.innerHTML = "";
        text.split(/\s+/g).forEach(function(word) {
            if (word) {
                var span = document.createElement('span');
                span.className = 'word black';
                span.addEventListener('click', function() {
                    if (this.className === 'word') {
                        this.className = 'word black';
                    } else {
                        this.className = 'word';
                    }
                }, false);
                span.innerHTML = "&nbsp;" + word + "&nbsp;";
                p.appendChild(span);
            }
        });
    });
}, false);
