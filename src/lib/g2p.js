// Letters → sounds, for British RP.
//
// This is a fallback for words that aren't in the dictionary. English spelling
// being what it is, it gets most regular words right and will occasionally be
// wrong on an odd one. The app flags guessed words so you know to check them.

const V = 'aeiouy';
const isV = (c) => V.includes(c);

// Match a whole word against a list of base forms, tolerating regular
// inflections. Prefix matching would make 'breath' swallow 'breathe'.
const INFL = '(s|es|ed|d|ing|ly|er|est|ers|ings)?';
const words = (list) => new RegExp(`^(${list.join('|')})${INFL}$`);

// Words where 'ch' is /k/ or /ʃ/ rather than /tʃ/
const CH_K = /^(sch(?!wa)|chor|chrom|chron|chlor|christ|chem|chara|chaos|chao|arch(?!er|ery|bishop)|anch|orch|mech|monarch|psych|techn|ache|echo|stomach|scheme)/;
const CH_SH = /^(chef|chic|chiff|champagne|chandelier|chalet|chauff|chute|charade|machine|parachute|moustache|brochure|niche|cliche|quiche)/;

// 'g' stays hard before e/i/y in these
const HARD_G = /^(get|give|girl|gift|gig|gild|gilt|gear|geese|geld|geyser|gecko|geck|gynae|begin|begun|forget|target|tiger|anger|angry|hunger|finger|longer|stronger|younger|together|eager|tigers|giggle|girth|gimmick|gill)/;

// 'ng' pronounced /ŋɡ/ rather than /ŋ/
const NGG = /(finger|anger|angry|hunger|hungry|longer|longest|stronger|strongest|younger|youngest|single|angle|jungle|england|english|language|linger|mango|bingo|tango|congress|elongate|tangle|mingle|jingle|dangle)/;

// 'th' as the soft /ð/
const TH_VOICED = new Set(['the', 'this', 'that', 'these', 'those', 'them', 'then', 'there',
  'their', 'they', 'though', 'than', 'thus', 'thy', 'thee', 'thine', 'the', 'with', 'without',
  'within', 'withdraw', 'although', 'altogether', 'whether', 'either', 'neither', 'other',
  'another', 'mother', 'father', 'brother', 'weather', 'together', 'rather', 'gather',
  'further', 'farther', 'northern', 'southern', 'worthy', 'breathe', 'bathe', 'clothe',
  'soothe', 'smooth', 'these', 'thither', 'lathe', 'writhe', 'scythe', 'seethe', 'loathe']);

// The TRAP–BATH split: these take /ɑː/ in RP where a short /æ/ might be expected
const BATH = words(['ask', 'bask', 'task', 'mask', 'cask', 'flask', 'basket', 'rascal',
  'bath', 'path', 'lath', 'wrath', 'after', 'afternoon', 'rafter', 'laugh', 'laughter',
  'draft', 'draught', 'craft', 'graft', 'shaft', 'raft', 'daft', 'staff', 'chaff',
  'calf', 'half', 'behalf', 'graph', 'giraffe', 'class', 'glass', 'grass', 'pass',
  'brass', 'last', 'fast', 'past', 'cast', 'vast', 'blast', 'mast', 'nasty', 'ghastly',
  'master', 'plaster', 'disaster', 'castle', 'clasp', 'grasp', 'gasp', 'rasp',
  'answer', 'chance', 'dance', 'france', 'advance', 'glance', 'prance', 'enhance',
  'branch', 'ranch', 'blanch', 'command', 'demand', 'slander', 'reprimand',
  'plant', 'grant', 'slant', 'chant', 'advantage', 'example', 'sample', 'trample',
  'aunt', 'banana', 'cant', 'shant', 'rather', 'father', 'calm', 'palm', 'balm',
  'psalm', 'almond', 'alms', 'salmon', 'pastor', 'pasture', 'basta']);

// 'oo' as short /ʊ/
const OO_SHORT = words(['book', 'look', 'took', 'cook', 'hook', 'shook', 'brook', 'crook',
  'foot', 'good', 'hood', 'stood', 'wood', 'wool', 'soot', 'nook', 'rook', 'hoof',
  'football', 'cookbook', 'goodness', 'wooden', 'woollen', 'booklet']);
const OO_BLOOD = words(['blood', 'flood', 'bloody', 'flooded']);

// 'ou' families
const OU_SHORT_U = words(['young', 'country', 'couple', 'trouble', 'touch', 'cousin',
  'double', 'enough', 'rough', 'tough', 'nourish', 'courage', 'flourish', 'southern',
  'thorough', 'younger', 'youngest', 'countries', 'encourage']);
const OU_LONG_OO = words(['you', 'group', 'soup', 'through', 'youth', 'route', 'wound',
  'coup', 'routine', 'souvenir', 'troupe', 'croup', 'ghoul', 'uncouth', 'youthful']);
const OU_SHORT_OO = words(['would', 'could', 'should']);
const OU_AW = words(['bought', 'thought', 'fought', 'sought', 'brought', 'nought',
  'ought', 'four', 'pour', 'court', 'source', 'course', 'your', 'mourn', 'resource',
  'fourth', 'fourteen', 'courtesy', 'yours']);

// 'u' as /ʊ/
const U_SHORT_OO = words(['put', 'push', 'pull', 'full', 'bull', 'bush', 'butcher',
  'pudding', 'cushion', 'pulpit', 'bullet', 'bulletin', 'fulfil', 'sugar', 'puss',
  'pullover', 'bushy', 'fully', 'pushing', 'putting']);
// 'u' as /juː/
const U_YOO = words(['use', 'user', 'unit', 'unite', 'union', 'universe', 'university',
  'uniform', 'unique', 'usual', 'utensil', 'eulogy', 'euro', 'europe', 'useful',
  'useless', 'united', 'unity']);

// 'ea' as short /e/ …
const EA_SHORT = words(['head', 'bread', 'dead', 'deaf', 'death', 'health', 'wealth',
  'weather', 'breath', 'ready', 'steady', 'heavy', 'meant', 'sweat', 'thread', 'threat',
  'pleasant', 'peasant', 'measure', 'treasure', 'pleasure', 'feather', 'leather',
  'weapon', 'jealous', 'breakfast', 'instead', 'spread', 'dread', 'realm', 'meadow',
  'endeavour', 'heaven', 'heavily', 'already', 'healthy', 'wealthy', 'deadly']);
// … and as /eɪ/
const EA_LONG_A = words(['great', 'break', 'steak', 'yea', 'greater', 'greatest', 'breaking']);

// 'o' as /ʌ/
const O_SHORT_U = words(['some', 'come', 'done', 'none', 'love', 'above', 'month',
  'money', 'honey', 'son', 'ton', 'won', 'front', 'wonder', 'london', 'brother',
  'mother', 'other', 'nothing', 'dozen', 'oven', 'glove', 'shove', 'cover', 'govern',
  'colour', 'company', 'among', 'tongue', 'monk', 'monkey', 'stomach', 'worry',
  'onion', 'comfort', 'wonderful', 'lovely', 'monthly', 'discover', 'recover']);

// 'ow' as /əʊ/ rather than /aʊ/
const OW_LONG_O = words(['know', 'snow', 'low', 'grow', 'show', 'throw', 'slow', 'blow',
  'flow', 'glow', 'crow', 'own', 'bowl', 'owe', 'shown', 'thrown', 'growth', 'below',
  'elbow', 'arrow', 'narrow', 'borrow', 'tomorrow', 'follow', 'hollow', 'swallow']);

// after these consonants, 'u'/'ew'/'ue' is /uː/ not /juː/
const NO_YOD = 'rljʃtʃdʒ';

const ENDINGS = [
  ['tion', ['ʃ', 'ə', 'n']],
  ['sion', ['ʒ', 'ə', 'n']],
  ['ssion', ['ʃ', 'ə', 'n']],
  ['cious', ['ʃ', 'ə', 's']],
  ['tious', ['ʃ', 'ə', 's']],
  ['ious', ['ɪ', 'ə', 's']],
  ['eous', ['ɪ', 'ə', 's']],
  ['ous', ['ə', 's']],
  ['ture', ['tʃ', 'ə']],
  ['sure', ['ʒ', 'ə']],
  ['ment', ['m', 'ə', 'n', 't']],
  ['ness', ['n', 'ə', 's']],
  ['able', ['ə', 'b', 'ə', 'l']],
  ['ible', ['ə', 'b', 'ə', 'l']],
  ['ance', ['ə', 'n', 's']],
  ['ence', ['ə', 'n', 's']],
  ['ant', ['ə', 'n', 't']],
  ['ent', ['ə', 'n', 't']],
  ['age', ['ɪ', 'dʒ']],
  ['ledge', ['l', 'ɪ', 'dʒ']],
  ['ology', ['ɒ', 'l', 'ə', 'dʒ', 'i']],
  ['ity', ['ɪ', 't', 'i']],
  ['ary', ['ə', 'r', 'i']],
  ['ory', ['ə', 'r', 'i']],
  ['ally', ['ə', 'l', 'i']],
  ['ful', ['f', 'ə', 'l']],
  ['ish', ['ɪ', 'ʃ']],
  ['ing', ['ɪ', 'ŋ']],
  ['dom', ['d', 'ə', 'm']],
  ['some', ['s', 'ə', 'm']],
  ['al', ['ə', 'l']],
  ['el', ['ə', 'l']],
  ['ol', ['ə', 'l']],
  ['tle', ['t', 'ə', 'l']],
  ['dle', ['d', 'ə', 'l']],
  ['ble', ['b', 'ə', 'l']],
  ['ple', ['p', 'ə', 'l']],
  ['gle', ['ɡ', 'ə', 'l']],
  ['kle', ['k', 'ə', 'l']],
  ['cle', ['k', 'ə', 'l']],
  ['zle', ['z', 'ə', 'l']],
  ['fle', ['f', 'ə', 'l']],
  ['stle', ['s', 'ə', 'l']],
];

/**
 * @param {string} word lowercase, letters only
 * @returns {string[]} IPA phoneme tokens
 */
export function lettersToSounds(word, depth = 0) {
  const w = word.toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');
  if (!w) return [];

  // Peel off regular inflections and work out the ending's voicing from the
  // stem, so 'jumped' comes out /dʒʌmpt/ and 'begged' /beɡd/.
  if (depth === 0) {
    if (/[^e]ed$/.test(w) && w.length >= 5) {
      let stem = w.slice(0, -2);
      if (/(.)\1$/.test(stem)) stem = stem.slice(0, -1);        // begged → beg
      else if (/[^aeiou]$/.test(stem) && !/[aeiou][^aeiou]$/.test(stem)) stem += 'e';
      const base = lettersToSounds(stem, 1);
      const last = base[base.length - 1];
      if (base.length) {
        if (last === 't' || last === 'd') return [...base, 'ɪ', 'd'];
        return [...base, ['p', 't', 'k', 'f', 'θ', 's', 'ʃ', 'tʃ', 'ks'].includes(last) ? 't' : 'd'];
      }
    }
    if (/[^aeious]s$/.test(w) && w.length >= 4) {
      const base = lettersToSounds(w.slice(0, -1), 1);
      const last = base[base.length - 1];
      if (base.length) {
        if (['s', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ'].includes(last)) return [...base, 'ɪ', 'z'];
        return [...base, ['p', 't', 'k', 'f', 'θ', 'ks'].includes(last) ? 's' : 'z'];
      }
    }
    if (/(ch|sh|ss|x|s|z)es$/.test(w) && w.length >= 5) {
      const base = lettersToSounds(w.slice(0, -2), 1);
      if (base.length) return [...base, 'ɪ', 'z'];
    }
  }
  const out = [];
  const n = w.length;
  const thVoiced = TH_VOICED.has(w);
  const nggWord = NGG.test(w);
  let i = 0;

  const at = (k) => w[k] ?? '';
  const rest = (k) => w.slice(k);
  const push = (...p) => out.push(...p);
  // does a vowel letter follow position k?
  const vAfter = (k) => isV(at(k));
  // is this the last position?
  const atEnd = (k) => k >= n;

  // A magic-e: vowel + one consonant + final 'e'
  const magicE = (k, vLen = 1) => {
    const after = w.slice(k + vLen);
    return /^[bcdfgklmnprstvz]{1,2}e$/.test(after) && !/^[bcdfgklmnprstvz]{2}e$/.test(after)
      ? true
      : /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sl|sm|sn|sp|st|tr|th|ch|sh|ng|nc|ns|nd|rc|rs|rg|rv|rt|st|zz)?[bcdfgklmnprstvz]e$/.test(after) && after.length <= 3;
  };

  // ── word-final endings, matched first ────────────────────────────────────
  let tail = [];
  for (const [suf, ph] of ENDINGS) {
    if (w.length > suf.length + 1 && w.endsWith(suf)) {
      tail = ph;
      break;
    }
  }
  const body = tail.length ? w.slice(0, n - ENDINGS.find(([s]) => w.endsWith(s) && w.length > s.length + 1)[0].length) : w;
  const lim = body.length;

  // The open-syllable (VCV) rule: a vowel followed by a single consonant and
  // another vowel is usually long — lazy, baby, paper, open, music, na|tion.
  // 'r' is excluded because vowel+r is handled by the r-coloured rules above.
  const openSyl = (k) => {
    if (tail.length && k + 1 >= lim) return true;
    return lim >= 4 && /^[bcdfgklmnpstvz][aeiouy]/.test(w.slice(k + 1));
  };

  while (i < lim) {
    const c = w[i];
    const r = rest(i);
    const nx = at(i + 1);
    const nx2 = at(i + 2);

    // ── consonant clusters ────────────────────────────────────────────────
    if (i === 0 && /^(kn|gn|pn|ps|pt|wr|mn)/.test(r)) {
      push(r[0] === 'w' ? 'r' : r[1] === 'n' ? 'n' : r[1] === 's' ? 's' : 't'); i += 2; continue;
    }
    if (r.startsWith('tch')) { push('tʃ'); i += 3; continue; }
    if (r.startsWith('dge')) { push('dʒ'); i += 3; continue; }
    if (r.startsWith('sch') && i === 0) { push('s', 'k'); i += 3; continue; }
    if (r.startsWith('ch')) {
      if (CH_K.test(w) || CH_K.test(r)) push('k');
      else if (CH_SH.test(w) || CH_SH.test(r)) push('ʃ');
      else push('tʃ');
      i += 2; continue;
    }
    if (r.startsWith('sh')) { push('ʃ'); i += 2; continue; }
    if (r.startsWith('ph')) { push('f'); i += 2; continue; }
    if (r.startsWith('th')) { push(thVoiced ? 'ð' : 'θ'); i += 2; continue; }
    if (r.startsWith('wh')) { push(/^wh(o|ole)/.test(r) ? 'h' : 'w'); i += 2; continue; }
    if (r.startsWith('ck')) { push('k'); i += 2; continue; }
    if (r.startsWith('qu')) { push('k', 'w'); i += 2; continue; }
    if (r.startsWith('ng')) {
      if (nggWord) push('ŋ', 'ɡ');
      else push('ŋ');
      i += 2; continue;
    }
    if (r.startsWith('nk')) { push('ŋ', 'k'); i += 2; continue; }
    if (r.startsWith('mb') && i + 2 >= lim) { push('m'); i += 2; continue; }
    if (r.startsWith('mn') && i + 2 >= lim) { push('m'); i += 2; continue; }
    if (r.startsWith('gh')) {
      if (i === 0) { push('ɡ'); i += 2; continue; }
      if (/^gh(t|$)/.test(r)) { i += 2; continue; }      // silent: night, light
      push('f'); i += 2; continue;                        // laugh, tough
    }
    if (r.startsWith('gu') && isV(at(i + 2))) { push('ɡ'); i += 2; continue; }

    // ── r-coloured vowels (non-rhotic) ────────────────────────────────────
    if (/^(air|ayer)/.test(r)) { push('ɛː'); i += 3; continue; }
    if (/^are$/.test(r) || (/^are/.test(r) && !isV(at(i + 3)))) { push('ɛː'); i += 3; continue; }
    if (/^ere$/.test(r)) { push(/^(th|wh)/.test(w) ? 'ɛː' : 'ɪə'); i += 3; continue; }
    if (/^(eer|ier)/.test(r) && !isV(at(i + 3))) { push('ɪə'); i += 3; continue; }
    if (/^ear/.test(r)) {
      if (/^(earth|earn|early|earl|search|learn|heard|rehears|yearn|pearl)/.test(w)) push('ɜː');
      else if (/^(bear|pear|wear|swear|tear$|tears$)/.test(w)) push('ɛː');
      else if (!isV(at(i + 3))) push('ɪə');
      else push('ɪə');
      i += 3; continue;
    }
    if (/^our/.test(r)) {
      if (/^(journ|courte|scourge)/.test(r)) { push('ɜː'); i += 3; continue; }
      if (i + 3 >= lim && i > 0) push('ə');                 // colour, favour
      else if (/^(our|hour|flour|sour|scour|devour)/.test(w)) push('aʊ', 'ə');
      else if (OU_AW.test(w)) push('ɔː');
      else push('aʊ', 'ə');
      i += 3; continue;
    }
    if (/^oor/.test(r)) { push('ɔː'); i += 3; continue; }
    if (/^ure/.test(r) && i + 3 >= lim) { push(i === 0 ? 'j' : '', 'ɔː'); i += 3; continue; }
    if (/^(ar)/.test(r) && !isV(at(i + 2))) {
      const pre = w.slice(Math.max(0, i - 2), i);
      push(/w$|qu$/.test(pre) ? 'ɔː' : 'ɑː'); i += 2; continue;
    }
    if (/^(or)/.test(r) && !isV(at(i + 2))) {
      if (/w$/.test(w.slice(0, i)) && /^(word|work|world|worth|worse|worst|worm|worship)/.test(w)) push('ɜː');
      else if (i + 2 >= lim && i > 1) push('ə');            // doctor, actor
      else push('ɔː');
      i += 2; continue;
    }
    if (/^(er|ir|ur|yr)/.test(r) && !isV(at(i + 2))) {
      if (c === 'e' && i + 2 >= lim && i > 1) push('ə');    // better, water
      else push('ɜː');
      i += 2; continue;
    }
    if (/^er/.test(r) && i + 2 >= lim) { push('ə'); i += 2; continue; }

    // ── vowel digraphs ────────────────────────────────────────────────────
    if (/^(augh|ough)t/.test(r)) { push('ɔː'); i += 4; continue; }
    if (/^ough/.test(r)) {
      if (/^(enough|rough|tough)/.test(w)) { push('ʌ', 'f'); i += 4; continue; }
      if (/^cough/.test(w)) { push('ɒ', 'f'); i += 4; continue; }
      if (/^through/.test(w)) { push('uː'); i += 4; continue; }
      if (/^(though|dough)/.test(w)) { push('əʊ'); i += 4; continue; }
      push('ɔː'); i += 4; continue;
    }
    if (/^augh/.test(r)) { push(/^laugh/.test(w) ? 'ɑː' : 'ɔː'); i += 4; if (/^laugh/.test(w)) push('f'); continue; }
    if (/^igh/.test(r)) { push('aɪ'); i += 3; continue; }
    if (/^eigh/.test(r)) { push('eɪ'); i += 4; continue; }
    if (/^(ai|ay)/.test(r)) { push(/^(said|says)/.test(w) ? 'e' : 'eɪ'); i += 2; continue; }
    if (/^ea/.test(r)) {
      if (EA_SHORT.test(w)) push('e');
      else if (EA_LONG_A.test(w)) push('eɪ');
      else push('iː');
      i += 2; continue;
    }
    if (/^ee/.test(r)) { push('iː'); i += 2; continue; }
    if (/^(ei|ey)/.test(r)) {
      if (i + 2 >= lim && i > 1) push('i');                 // money, valley
      else if (/^(receive|ceiling|seize|either|neither|weird|protein|caffeine|key)/.test(w)) push('iː');
      else push('eɪ');
      i += 2; continue;
    }
    if (/^ie/.test(r)) {
      if (i + 2 >= lim) push('aɪ');                         // pie, tie, lie
      else if (/^(friend)/.test(w)) push('e');
      else if (/^(die|lie|tie|pie|vie)/.test(w)) push('aɪ');
      else push('iː');                                      // field, piece
      i += 2; continue;
    }
    if (/^oa/.test(r)) { push(/^broad|^abroad/.test(w) ? 'ɔː' : 'əʊ'); i += 2; continue; }
    if (/^oe/.test(r) && i + 2 >= lim) { push('əʊ'); i += 2; continue; }
    if (/^oo/.test(r)) {
      if (OO_BLOOD.test(w)) push('ʌ');
      else if (OO_SHORT.test(w)) push('ʊ');
      else push('uː');
      i += 2; continue;
    }
    if (/^(oi|oy)/.test(r)) { push('ɔɪ'); i += 2; continue; }
    if (/^au/.test(r) || /^aw(?![aeiouy])/.test(r)) { push('ɔː'); i += 2; continue; }
    if (/^ou/.test(r)) {
      if (OU_SHORT_U.test(w)) push('ʌ');
      else if (OU_LONG_OO.test(w)) push('uː');
      else if (OU_SHORT_OO.test(w)) push('ʊ');
      else if (OU_AW.test(w)) push('ɔː');
      else push('aʊ');
      i += 2; continue;
    }
    if (/^ow/.test(r)) {
      const final = i + 2 >= lim;
      if (final && i > 0) push('əʊ');                       // window, yellow, snow
      else if (OW_LONG_O.test(w)) push('əʊ');
      else push('aʊ');
      i += 2; continue;
    }
    if (/^(ew)/.test(r)) {
      const prev = out[out.length - 1] ?? '';
      push(NO_YOD.includes(prev) ? 'uː' : 'j', 'uː');
      if (NO_YOD.includes(prev)) out.splice(out.length - 2, 1);
      i += 2; continue;
    }
    if (/^ue/.test(r) && i + 2 >= lim) {
      const prev = out[out.length - 1] ?? '';
      if (NO_YOD.includes(prev)) push('uː'); else push('uː');
      i += 2; continue;
    }
    if (/^ui/.test(r)) { push(/^(build|guilt|guitar|circuit)/.test(w) ? 'ɪ' : 'uː'); i += 2; continue; }
    if (/^(al)(?=[kmf])/.test(r)) { push('ɔː'); i += 2; if (at(i) === 'l') i++; continue; }
    if (/^all/.test(r)) { push('ɔː', 'l'); i += 3; continue; }

    // ── single vowels ─────────────────────────────────────────────────────
    if (c === 'a') {
      if (magicE(i)) { push('eɪ'); i++; continue; }
      if (BATH.test(w)) { push('ɑː'); i++; continue; }
      if (i === 0 && lim > 3 && !isV(nx)) { push('ə'); i++; continue; }  // about, above
      if (i + 1 >= lim && i > 0 && !tail.length) { push('ə'); i++; continue; } // sofa, comma
      if (openSyl(i)) { push('eɪ'); i++; continue; }                     // lazy, paper, nation
      push('æ'); i++; continue;
    }
    if (c === 'e') {
      if (i + 1 >= lim && !tail.length && i > 0) { i++; continue; }      // silent final e
      if (magicE(i)) { push('iː'); i++; continue; }
      if (i === 0 && /^(be|de|re|pre)[bcdfgklmnpstvz]/.test(w) && lim > 4) { push('ɪ'); i++; continue; }
      if (openSyl(i)) { push('iː'); i++; continue; }                     // even, legal
      push('e'); i++; continue;
    }
    if (c === 'i') {
      if (/^i(nd|ld)$/.test(rest(i))) { push('aɪ'); i++; continue; }     // find, child
      if (magicE(i)) { push('aɪ'); i++; continue; }
      if (i + 1 >= lim && tail.length) { push('aɪ'); i++; continue; }    // di|al, tri|al
      push('ɪ'); i++; continue;
    }
    if (c === 'o') {
      if (magicE(i)) { push('əʊ'); i++; continue; }
      if (O_SHORT_U.test(w)) { push('ʌ'); i++; continue; }
      if (i + 1 >= lim) { push('əʊ'); i++; continue; }                   // go, no, so
      if (openSyl(i)) { push('əʊ'); i++; continue; }                     // open, total, solo
      push('ɒ'); i++; continue;
    }
    if (c === 'u') {
      if (U_SHORT_OO.test(w)) { push('ʊ'); i++; continue; }
      if (magicE(i) || openSyl(i)) {
        const prev = out[out.length - 1] ?? '';
        if (!NO_YOD.includes(prev)) push('j');
        push('uː'); i++; continue;
      }
      if (U_YOO.test(w) && i === 0) { push('j', 'uː'); i++; continue; }
      push('ʌ'); i++; continue;
    }
    if (c === 'y') {
      if (i === 0 && isV(nx)) { push('j'); i++; continue; }
      if (i + 1 >= lim && !tail.length) { push(lim <= 3 ? 'aɪ' : 'i'); i++; continue; }
      if (magicE(i)) { push('aɪ'); i++; continue; }
      push('ɪ'); i++; continue;
    }

    // ── single consonants ─────────────────────────────────────────────────
    if (c === 'c') {
      if (nx && 'eiy'.includes(nx)) push('s'); else push('k');
      i++; if (at(i) === 'c') i++; continue;
    }
    if (c === 'g') {
      if (nx && 'eiy'.includes(nx) && !HARD_G.test(w)) push('dʒ'); else push('ɡ');
      i++; if (at(i) === 'g') i++; continue;
    }
    if (c === 's') {
      if (nx === 's') { push('s'); i += 2; continue; }
      if (i > 0 && i + 1 >= lim) {
        const prev = out[out.length - 1] ?? '';
        push('ptkfθ'.includes(prev) ? 's' : 'z');
      } else if (i > 0 && isV(w[i - 1]) && isV(nx)) push('z');
      else push('s');
      i++; continue;
    }
    if (c === 'x') { push(i === 0 ? 'z' : 'ks'); i++; continue; }
    if (c === 'j') { push('dʒ'); i++; continue; }
    if (c === 'h' && i > 0 && !isV(nx)) { i++; continue; }

    const simple = { b: 'b', d: 'd', f: 'f', h: 'h', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p', r: 'r', t: 't', v: 'v', w: 'w', z: 'z' }[c];
    if (simple) {
      push(simple);
      i++;
      if (at(i) === c) i++;   // doubled consonant
      continue;
    }
    i++;
  }

  out.push(...tail);

  // English has no doubled consonants inside a word, so collapse any that the
  // rules produced at a seam (hud + dle → /hʌdəl/, not /hʌddəl/).
  const clean = [];
  for (const p of out.filter(Boolean)) {
    if (clean.length && clean[clean.length - 1] === p && !'ɪeæʌɒʊəi'.includes(p)) continue;
    clean.push(p);
  }
  return clean;
}
