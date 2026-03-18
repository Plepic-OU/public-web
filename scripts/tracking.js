// GA4 + Google Ads init
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

// Scroll depth tracking (homepage only)
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
  var scrollThresholds = [25, 50, 75, 100];
  var scrollFired = {};

  window.addEventListener('scroll', function() {
    var scrollPercent = Math.round(
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
    );

    scrollThresholds.forEach(function(threshold) {
      if (scrollPercent >= threshold && !scrollFired[threshold]) {
        scrollFired[threshold] = true;
        gtag('event', 'scroll_depth', { percent: threshold, page: 'homepage' });
      }
    });
  }, { passive: true });

  // Pricing section visibility
  var pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    var pricingObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          gtag('event', 'pricing_viewed', { page: 'homepage' });
          pricingObserver.disconnect();
        }
      });
    }, { threshold: 0.5 });

    pricingObserver.observe(pricingSection);
  }
}
