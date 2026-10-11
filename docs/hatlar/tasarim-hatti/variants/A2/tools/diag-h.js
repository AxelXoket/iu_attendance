(() => [...document.querySelectorAll('section[id]')].map(s => s.id + ' ' + Math.round(s.getBoundingClientRect().height)).join('\n'))()
