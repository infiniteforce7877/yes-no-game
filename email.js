const EmailCheck = (() => {
  const DISPOSABLE = new Set([
    'mailinator.com','10minutemail.com','tempmail.com','guerrillamail.com',
    'throwawaymail.com','yopmail.com','sharklasers.com','trashmail.com',
    'getnada.com','temp-mail.org','mintemail.com','dispostable.com',
    'mailnesia.com','spamgourmet.com','mytemp.email','fakeinbox.com',
    'throwaway.email','maildrop.cc','tempinbox.com','discard.email',
    'emailondeck.com','grr.la','guerrillamail.info','guerrillamail.net',
    'guerrillamail.org','guerrillamail.biz','guerrillamail.de','spam4.me',
    'tempmail.net','tempmailo.com','10minutemail.net','20minutemail.com',
    'burnermail.io','mailcatch.com','mohmal.com','moakt.com','tempail.com',
    'throwawaymail.net','mailsac.com','inboxkitten.com','mail-temp.com'
  ]);

  const TYPOS = {
    'gmial.com':'gmail.com','gmai.com':'gmail.com','gmail.co':'gmail.com',
    'gmail.con':'gmail.com','gmaill.com':'gmail.com','gnail.com':'gmail.com',
    'yaho.com':'yahoo.com','yahooo.com':'yahoo.com','yhoo.com':'yahoo.com',
    'outlok.com':'outlook.com','outlook.co':'outlook.com',
    'hotmial.com':'hotmail.com','hotmai.com':'hotmail.com'
  };

  const mxCache = new Map();

  async function lookupMX(domain) {
    const key = domain.toLowerCase();
    if (mxCache.has(key)) return mxCache.get(key);
    try {
      const url = 'https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(domain) + '&type=MX';
      const res = await fetch(url, { headers: { 'Accept': 'application/dns-json' } });
      if (!res.ok) throw new Error('dns fail');
      const data = await res.json();
      const ok = Array.isArray(data.Answer) && data.Answer.length > 0;
      mxCache.set(key, ok);
      return ok;
    } catch (_) {
      return true;
    }
  }

  async function validate(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') return { valid: false, reason: 'Email required' };
    const email = rawEmail.trim().toLowerCase();
    if (email.length > 254) return { valid: false, reason: 'Email bahut lamba hai' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { valid: false, reason: 'Email format galat hai' };

    const [, domain] = email.split('@');
    if (!domain) return { valid: false, reason: 'Email format galat hai' };
    if (DISPOSABLE.has(domain)) return { valid: false, reason: 'Disposable email allowed nahi hai' };
    if (TYPOS[domain]) return { valid: false, reason: 'Did you mean ' + TYPOS[domain] + '?' };

    const mxOk = await lookupMX(domain);
    if (!mxOk) return { valid: false, reason: 'Ye email domain mail receive nahi karta' };

    return { valid: true };
  }

  return { validate };
})();
