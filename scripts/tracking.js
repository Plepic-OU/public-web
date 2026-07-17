// GA4 + Google Ads init
(function() {

// The privacy policy commits us to honouring Do Not Track, so the tag is injected
// here rather than in the page head: when the signal is set we make no request to
// Google at all, set no cookies, and bind no listeners.
var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
if (dnt === '1' || dnt === 'yes') return;

var tag = document.createElement('script');
tag.async = true;
tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-65CCEV6RS9';
document.head.appendChild(tag);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-65CCEV6RS9');
gtag('config', 'AW-17874572217');

// Conversion tracking (GA4 events + Google Ads conversions)
document.addEventListener('click', function(e) {
  var link = e.target.closest('a');
  if (!link) return;
  var href = link.href || '';

  if (href.indexOf('forms.gle/3M7XrK845svufeFn6') !== -1) {
    gtag('event', 'google_form_signup', { value: 504, currency: 'EUR' });
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/1kJMCIeh7vEbELmnoctC',
      'value': 504, 'currency': 'EUR'
    });
  } else if (href.indexOf('calendar.app.google') !== -1) {
    gtag('event', 'calendar_click', { value: 50, currency: 'EUR' });
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/o9b0CIqh7vEbELmnoctC',
      'value': 50, 'currency': 'EUR'
    });
  } else if (href.indexOf('mailto:kaido@plepic.com') !== -1) {
    gtag('event', 'email_click', { value: 5, currency: 'EUR' });
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/RDYVCIul7vEbELmnoctC',
      'value': 5, 'currency': 'EUR'
    });
  } else if (href.indexOf('tel:+3725077333') !== -1) {
    gtag('event', 'phone_click', { value: 5, currency: 'EUR' });
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/Rl7sCI6l7vEbELmnoctC',
      'value': 5, 'currency': 'EUR'
    });
  } else if (href.indexOf('linkedin.com/in/kaidokoort') !== -1) {
    gtag('event', 'linkedin_click', { value: 1, currency: 'EUR' });
    gtag('event', 'conversion', {
      'send_to': 'AW-17874572217/3LOMCImm7vEbELmnoctC',
      'value': 1, 'currency': 'EUR'
    });
  } else if (href.indexOf('discord.gg/') !== -1) {
    gtag('event', 'discord_click', { value: 2, currency: 'EUR' });
  }
});

// Homepage scroll depth tracking (25/50/75/100%)
(function() {
  var scrollThresholds = [25, 50, 75, 100];
  var firedThresholds = {};
  window.addEventListener('scroll', function() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight <= 0) return;
    var scrollPercent = Math.round((scrollTop / docHeight) * 100);
    for (var i = 0; i < scrollThresholds.length; i++) {
      var threshold = scrollThresholds[i];
      if (scrollPercent >= threshold && !firedThresholds[threshold]) {
        firedThresholds[threshold] = true;
        gtag('event', 'scroll_depth', { percent: threshold, page_path: window.location.pathname });
      }
    }
  }, { passive: true });
})();

// Training page #pricing section visibility
(function() {
  if (typeof IntersectionObserver === 'undefined') return;
  var pricingSection = document.getElementById('pricing');
  if (!pricingSection) return;
  var fired = false;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting && !fired) {
        fired = true;
        gtag('event', 'pricing_section_view', { page_path: window.location.pathname });
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });
  observer.observe(pricingSection);
})();

})();
