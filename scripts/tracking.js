// GA4 + Google Ads init
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-65CCEV6RS9');
gtag('config', 'AW-17874572217');

// Google Ads conversion tracking
document.addEventListener('click', function(e) {
  var link = e.target.closest('a');
  if (!link) return;
  var href = link.href || '';

  if (href.indexOf('forms.gle/3M7XrK845svufeFn6') !== -1) {
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/1kJMCIeh7vEbELmnoctC',
      'value': 504, 'currency': 'EUR'
    });
  } else if (href.indexOf('calendar.app.google/h5sq5y19e8a11GRQ7') !== -1) {
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/o9b0CIqh7vEbELmnoctC',
      'value': 50, 'currency': 'EUR'
    });
  } else if (href.indexOf('mailto:kaido@plepic.com') !== -1) {
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/RDYVCIul7vEbELmnoctC',
      'value': 5, 'currency': 'EUR'
    });
  } else if (href.indexOf('tel:+3725077333') !== -1) {
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/Rl7sCI6l7vEbELmnoctC',
      'value': 5, 'currency': 'EUR'
    });
  } else if (href.indexOf('linkedin.com/in/kaidokoort') !== -1) {
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/3LOMCImm7vEbELmnoctC',
      'value': 1, 'currency': 'EUR'
    });
  }
});
