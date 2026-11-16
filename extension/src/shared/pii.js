// Henkilötietojen tunnistus ja korvaus ennen AI-kutsua.
//   henkilötunnus → [hetu], tilinumero (IBAN) → [tilinumero], korttinumero (Luhn) → [kortti],
//   puhelinnumero → [puhelin], katuosoite → [katuosoite], postinumero + paikkakunta → [postinumero],
//   rekisterinumero → [rekisteri], suojattavat nimet (myös taivutetut) → [nimi]
// Mieluummin liikaa kuin liian vähän: väärä osuma vain heikentää luokittelua hieman.
// Vieraita nimiä ei tunnisteta: vain oma nimi, suojattavien nimien lista ja (valinnaisesti) osoitekirja.

export const PII_TOKENS = {
  hetu: "[hetu]",
  phone: "[puhelin]",
  iban: "[tilinumero]",
  card: "[kortti]",
  street: "[katuosoite]",
  postal: "[postinumero]",
  plate: "[rekisteri]",
  name: "[nimi]",
};

export const PII_LABELS = {
  email: "sähköposti",
  hetu: "henkilötunnus",
  phone: "puhelin",
  iban: "tilinumero",
  card: "kortti",
  street: "katuosoite",
  postal: "postinumero",
  plate: "rekisteri",
  name: "nimi",
};

// Rajat: ei kirjain/numero vieressä (toimii myös ä/ö-merkeillä)
const NB = String.raw`(?<![\p{L}\p{N}])`;
const NA = String.raw`(?![\p{L}\p{N}])`;

// Henkilötunnus: PPKKVV + vuosisatamerkki (+ - A–F U–Y) + 3 numeroa + tarkiste
const HETU_SOURCE = String.raw`${NB}(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])\d{2}[-+A-FU-Y]\d{3}[0-9ABCDEFHJKLMNPRSTUVWXY]${NA}`;

// ===== Puhelinnumerot =====

// Kansainvälinen muoto: +358 / 00358, välilyönnit ja viivat sallittu
const INTL_PHONE_SOURCE = String.raw`(?<![\p{N}+])(?:\+|00)358[\s-]?(?:\(0\)[\s-]?)?\d(?:[\s-]?\d){5,10}(?!\p{N})`;

// Kotimainen muoto: suuntanumero + 5–8 numeroa. Suuntanumerot:
//   02 03 05 06 08 09, 013–019, matkapuhelimet 04x ja 050, palvelunumerot 020x, 029x, 030, 0100, 0600, 0700, 0800
const AREA = String.raw`0(?:[1-9]00|20\d|29\d|1[3-9]|4\d|50|20|29|30|[235689])`;
const LOCAL_PHONE_SOURCE = String.raw`(?<![\p{L}\p{N}+#/.,-])\(?${AREA}\)?(?:[\s-]?\d){5,8}(?!\p{N}|[.,]\d)`;
// Päivämäärä välilyönnein tai viivoin (05 12 2026) ei ole puhelinnumero
const SPACED_DATE = /^\d{1,2}[\s-]\d{1,2}[\s-](?:19|20)\d{2}$/;

function isLocalPhone(candidate) {
  const digits = candidate.replace(/\D/g, "").length;
  if (SPACED_DATE.test(candidate)) return false;
  // Ilman välimerkkejä vain 9–10 numeroa (091234567, 0401234567): lyhyemmät ovat usein tilausnumeroita
  if (!/[\s()-]/.test(candidate)) return digits >= 9 && digits <= 10;
  return digits >= 7 && digits <= 11;
}

// ===== IBAN ja kortti =====

// IBAN-ehdokas: maakoodi + 2 numeroa + 11–30 merkkiä (välilyönnit sallittu)
const IBAN_SOURCE = String.raw`(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}(?![A-Za-z0-9])`;
// Suomalainen tilinumero aina, myös ilman kelvollista tarkistetta
const FI_IBAN_SOURCE = String.raw`(?<![A-Za-z0-9])FI ?\d{2}(?: ?\d){14}(?!\d)`;

// Kortti: 13–19 numeroa, välilyönnit tai viivat sallittu; korvataan vain jos Luhn täsmää
const CARD_SOURCE = String.raw`(?<!\p{N})\d(?:[ -]?\d){12,18}(?!\p{N})`;

// ===== Osoitteet =====

// Katuosoite: kadunnimi (…katu, …tie, …kuja jne.) + numero (+ väli) + porras tai huoneisto
const STREET_SUFFIXES = [
  "katu", "tie", "kuja", "polku", "raitti", "väylä", "kaari", "rinne", "ranta", "puisto", "aukio",
  "kenttä", "tanhua", "mäki", "gatan", "vägen", "gränd", "stigen",
];
const STREET_NUMBER = String.raw`\d{1,4}(?:\s?[-–]\s?\d{1,4})?`;
const STREET_APARTMENT = String.raw`(?:\s?(?:[a-zåäö]|as\.?|asunto|h\.?|lgh|bst)\s?\d{1,3}|\s?[a-zåäö])`;
const STREET_SOURCE = String.raw`${NB}\p{L}[\p{L}-]*?(?:${STREET_SUFFIXES.join("|")})\s+${STREET_NUMBER}(?:${STREET_APARTMENT})?${NA}`;
// Tavalliset sanat, jotka päättyvät kadunnimen päätteeseen (Seuranta 1234…, Lähetysseuranta 2)
const NOT_STREET = /seuranta$/iu;

// Postinumero + paikkakunta: viisi numeroa ja isolla alkava sana (00100 Helsinki)
const POSTAL_SOURCE = String.raw`(?<![\p{N}#])\d{5}(?!\p{N})\s+\p{Lu}[\p{L}-]+`;

// ===== Rekisterinumero =====

// 2–3 kirjainta + viiva, välilyönti tai ei mitään + 1–3 numeroa (ABC-123, abc 123, ABC123).
// Ei prosentteja, rahasummia, päivämääriä eikä kellonaikoja perässä.
const PLATE_SOURCE = String.raw`(?<![\p{L}\p{N}-])([a-zåäö]{2,3})[- ]?\d{1,3}(?![\p{L}\p{N}-]|\s?[%€$£]|[.,:/]\d)`;
// Lyhyet sanat ja lyhenteet, joita numero usein seuraa (klo 14, nro 123, ma 12.11., MP3, CO2, top 10)
const PLATE_STOPWORDS = new Set(
  (
    "ma ti ke to pe la su klo nro nr no vk vko kk vrk pv pvm kpl krs lk hlö hlo id tel fax puh " +
    "os osa ver rev vol art ch ep jak alk yht sis " +
    "on ja jo ei se he me te ne nyt kun jos tai vai yli oli voi saa tee ale eri muu oma kuu " +
    "in at of to for up by is get top the and now off all buy win day net per max min vs " +
    "mp ps co usb ios gt gtx rtx hd uhd fps web iso en din sfs eu cs " +
    "km cm mm kg mg ml dl cl gb mb tb kb hz khz mhz ghz kw kwh eur usd sek nok gbp alv " +
    "as ap ab oy oyj ry tmi ky"
  ).split(" ")
);

// ===== Tarkisteet =====

export function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export function ibanValid(compact) {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of value) remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return remainder === 1;
}

// Pisin kelvollinen IBAN ehdokkaan alusta (ehdokas voi jatkua seuraavaan sanaan).
// Palauttaa alkuperäisen merkkijonon pituuden (välilyönteineen) tai 0.
function validIbanPrefixLength(candidate) {
  let compact = "";
  let best = 0;
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i] === " ") continue;
    compact += candidate[i];
    if (compact.length >= 15 && ibanValid(compact)) best = i + 1;
  }
  return best;
}

// ===== Nimet ja taivutus =====

// Nimen alkuosa, jota vain taivutetaan, on vähintään tämän mittainen. Lyhyemmät: vain tarkka osuma.
export const MIN_INFLECTED_NAME = 4;

// Sijapäätteet, omistusliitteet ja liitepartikkelit
const CASE_ENDINGS = [
  "n", "a", "ä", "ta", "tä", "tta", "ttä", "lle", "lta", "ltä", "lla", "llä", "ssa", "ssä", "sta", "stä",
  "ksi", "na", "nä", "t", "an", "en", "in", "on", "un", "yn", "än", "ön", "hin", "hen", "han", "hon", "hun",
  "seen", "ine", "ineen", "ille", "ilta", "iltä", "illa", "illä", "issa", "issä", "ista", "istä", "iksi",
  "ien", "jen", "ja", "jä", "ihin", "ina", "inä",
];
const POSSESSIVES = ["ni", "si", "nsa", "nsä", "mme", "nne", "an", "en", "än"];
const CLITICS = ["kin", "kaan", "kään", "han", "hän", "pa", "pä", "ko", "kö"];

const alt = (list) => `(?:${[...list].sort((a, b) => b.length - a.length).join("|")})`;
// Perusmuodon perään: pääte valinnainen
const OPTIONAL_ENDING = `${alt(CASE_ENDINGS)}?${alt(POSSESSIVES)}?${alt(CLITICS)}?`;
// Taivutusvartalon perään: sijapääte pakollinen (Mikko → Miko-lle, Virtanen → Virtase-lle)
const REQUIRED_ENDING = `${alt(CASE_ENDINGS)}${alt(POSSESSIVES)}?${alt(CLITICS)}?`;

const VOWELS = "aeiouyäöå";

// Astevaihtelu viimeisessä tavussa: kk→k, pp→p, tt→t, nt→nn, lt→ll, rt→rr, mp→mm, nk→ng, ht→hd, t→d
function weakGrade(word) {
  const m = new RegExp(`^(.*[${VOWELS}])([^${VOWELS}]+)([${VOWELS}]+)$`, "u").exec(word);
  if (!m) return null;
  const [, head, cluster, tail] = m;
  let weak = null;
  if (/(kk|pp|tt)$/.test(cluster)) weak = cluster.slice(0, -1);
  else {
    for (const [strong, w] of [["nt", "nn"], ["lt", "ll"], ["rt", "rr"], ["mp", "mm"], ["nk", "ng"], ["ht", "hd"]]) {
      if (cluster.endsWith(strong)) {
        weak = cluster.slice(0, -2) + w;
        break;
      }
    }
    if (weak === null && cluster === "t") weak = "d";
  }
  return weak === null ? null : head + weak + tail;
}

// Taivutusvartalot, joihin sijapääte liitetään (perusmuotoa lukuun ottamatta)
export function inflectionStems(name) {
  const w = name.toLowerCase();
  if ([...w].length < MIN_INFLECTED_NAME) return [];
  const stems = new Set();
  if (w.endsWith("nen") && w.length >= 6) {
    stems.add(w.slice(0, -3) + "se"); // Virtanen → Virtase-lle
    stems.add(w.slice(0, -3) + "s"); // Virtas-ta
  } else if (new RegExp(`[${VOWELS}]s$`, "u").test(w)) {
    stems.add(w.slice(0, -1) + "kse"); // Tuomas → Tuomakse-lle
  } else if (w.endsWith("e")) {
    stems.add(w + "e"); // Laine → Lainee-lle
  }
  const weak = weakGrade(w);
  if (weak) stems.add(weak); // Mikko → Miko-lle
  if (w.endsWith("i")) {
    stems.add(w.slice(0, -1) + "e"); // Kivi → Kive-n
    if (weak) stems.add(weak.slice(0, -1) + "e"); // Lahti → Lahde-n
  }
  stems.delete(w);
  return [...stems].filter((s) => s.length >= 3);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Monisanaisesta nimestä myös osat (Teemu Testaaja → Teemu, Testaaja)
function expandNames(names) {
  const out = [];
  for (const raw of names) {
    const name = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 100) continue;
    out.push(name);
    if (name.includes(" ") && !name.includes("@")) {
      for (const part of name.split(/[\s,]+/)) if (part.length >= 3 && !/^\d+$/.test(part)) out.push(part);
    }
  }
  return [...new Set(out.map((n) => n.toLowerCase()))];
}

// Nimilistasta yksi regex. Kirjainkoko ei merkitse, koko sana, myös taivutetut muodot:
//   nimi ≥ 4 merkkiä: perusmuoto + valinnainen pääte, taivutusvartalot + pakollinen pääte
//   nimi < 4 merkkiä: vain tarkka osuma
// Monisanaiset nimet ensin, jotta "Teemu Testaajalle" korvautuu yhtenä kokonaisuutena.
export function buildNameMatcher(names = []) {
  const clean = expandNames(names);
  if (!clean.length) return null;

  const groups = { multiFull: [], multiStem: [], singleFull: [], singleStem: [], short: [] };
  for (const name of clean) {
    const words = name.split(" ");
    const multi = words.length > 1;
    const last = words.at(-1);
    const prefix = multi ? words.slice(0, -1).map(escapeRegex).join(String.raw`\s+`) + String.raw`\s+` : "";
    if ([...last].length < MIN_INFLECTED_NAME) {
      (multi ? groups.multiFull : groups.short).push({ source: prefix + escapeRegex(last), exact: true });
      continue;
    }
    (multi ? groups.multiFull : groups.singleFull).push({ source: prefix + escapeRegex(last) });
    for (const stem of inflectionStems(last)) {
      (multi ? groups.multiStem : groups.singleStem).push({ source: prefix + escapeRegex(stem) });
    }
  }

  const join = (items) => [...new Set(items.map((i) => i.source))].sort((a, b) => b.length - a.length).join("|");
  const parts = [];
  // Monisanaisten perusmuodot: lyhyet sukunimet ilman päätettä, muut valinnaisella päätteellä
  const multiExact = groups.multiFull.filter((i) => i.exact);
  const multiFull = groups.multiFull.filter((i) => !i.exact);
  if (multiFull.length) parts.push(`(?:${join(multiFull)})${OPTIONAL_ENDING}`);
  if (groups.multiStem.length) parts.push(`(?:${join(groups.multiStem)})${REQUIRED_ENDING}`);
  if (multiExact.length) parts.push(`(?:${join(multiExact)})`);
  if (groups.singleFull.length) parts.push(`(?:${join(groups.singleFull)})${OPTIONAL_ENDING}`);
  if (groups.singleStem.length) parts.push(`(?:${join(groups.singleStem)})${REQUIRED_ENDING}`);
  if (groups.short.length) parts.push(`(?:${join(groups.short)})`);

  return new RegExp(`${NB}(?:${parts.join("|")})${NA}`, "giu");
}

// ===== Korvaus =====

// Korvaa henkilötiedot tekstistä. Palauttaa { text, counts }.
// nameMatcher: buildNameMatcher(...)-tulos tai null.
export function redactPersonalData(input, nameMatcher = null) {
  const counts = {};
  const bump = (type) => (counts[type] = (counts[type] ?? 0) + 1);
  let text = String(input ?? "");

  text = text.replace(new RegExp(HETU_SOURCE, "giu"), () => (bump("hetu"), PII_TOKENS.hetu));

  text = text.replace(new RegExp(FI_IBAN_SOURCE, "gi"), () => (bump("iban"), PII_TOKENS.iban));
  text = text.replace(new RegExp(IBAN_SOURCE, "g"), (candidate) => {
    const length = validIbanPrefixLength(candidate);
    if (!length) return candidate;
    bump("iban");
    return PII_TOKENS.iban + candidate.slice(length);
  });

  text = text.replace(new RegExp(CARD_SOURCE, "gu"), (candidate) => {
    const digits = candidate.replace(/[ -]/g, "");
    if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) return candidate;
    bump("card");
    return PII_TOKENS.card;
  });

  text = text.replace(new RegExp(INTL_PHONE_SOURCE, "gu"), () => (bump("phone"), PII_TOKENS.phone));
  text = text.replace(new RegExp(LOCAL_PHONE_SOURCE, "gu"), (candidate) => {
    if (!isLocalPhone(candidate)) return candidate;
    bump("phone");
    return PII_TOKENS.phone;
  });

  text = text.replace(new RegExp(STREET_SOURCE, "giu"), (candidate) => {
    if (NOT_STREET.test(candidate.split(/\s/)[0])) return candidate;
    bump("street");
    return PII_TOKENS.street;
  });
  text = text.replace(new RegExp(POSTAL_SOURCE, "gu"), () => (bump("postal"), PII_TOKENS.postal));

  text = text.replace(new RegExp(PLATE_SOURCE, "giu"), (candidate, letters) => {
    if (PLATE_STOPWORDS.has(letters.toLowerCase())) return candidate;
    bump("plate");
    return PII_TOKENS.plate;
  });

  if (nameMatcher) {
    nameMatcher.lastIndex = 0;
    text = text.replace(nameMatcher, () => (bump("name"), PII_TOKENS.name));
  }

  return { text, counts };
}

// Viimeinen tarkistus: estetään kutsu, jos henkilötunnus tai korttinumero on yhä mukana
export function containsHetuOrCard(text) {
  const s = String(text ?? "");
  if (new RegExp(HETU_SOURCE, "iu").test(s)) return true;
  for (const m of s.match(new RegExp(CARD_SOURCE, "gu")) ?? []) {
    const digits = m.replace(/[ -]/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) return true;
  }
  return false;
}

// Nimistä suojattavat osat: koko nimi ja yli 2-kirjaimiset osat
export function nameParts(fullName) {
  const name = String(fullName ?? "").replace(/\s+/g, " ").trim();
  if (!name || name.includes("@")) return [];
  const parts = name.split(/[\s,]+/).filter((p) => p.length >= 3 && !/^\d+$/.test(p));
  return [...new Set([name, ...parts])];
}
