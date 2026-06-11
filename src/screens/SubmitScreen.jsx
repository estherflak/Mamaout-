import { useState } from 'react';
import { supabase } from '../lib/supabase';

const CATEGORIES    = ['Movement', 'Wellness', 'Baby-focused', 'Social'];
const DAYS          = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const AGE_RANGES    = ['Newborn–3m', '3–6m', '6–12m', 'All ages'];
const LANGUAGES     = ['Hebrew', 'English', 'Both'];
const STROLLER_OPTS = [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }, { key: 'not_sure', label: 'Not sure' }];

const EMPTY = {
  name: '', description: '', category: '',
  address: '', neighborhood: '',
  scheduleType: '', recurrenceDays: [], timeStart: '', timeEnd: '', oneTimeDate: '',
  isFree: false, price: '',
  strollerAccessible: '', ageRange: [], language: '',
  organizerName: '', organizerWhatsapp: '', organizerInstagram: '',
};

export default function SubmitScreen({ onClose }) {
  const [form, setForm]           = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(day)
        ? f.recurrenceDays.filter(d => d !== day)
        : [...f.recurrenceDays, day],
    }));
  }

  function toggleAge(range) {
    setForm(f => ({
      ...f,
      ageRange: f.ageRange.includes(range)
        ? f.ageRange.filter(r => r !== range)
        : [...f.ageRange, range],
    }));
  }

  async function submit() {
    if (!form.name.trim()) { setError('Activity name is required.'); return; }
    if (!supabase) { setError('Not connected to database.'); return; }
    setError('');
    setSubmitting(true);

    const { error: err } = await supabase.from('submissions').insert({
      name:               form.name.trim(),
      description:        form.description.trim() || null,
      category:           form.category || null,
      address:            form.address.trim() || null,
      neighborhood:       form.neighborhood.trim() || null,
      schedule_type:      form.scheduleType || null,
      schedule_label:     (form.scheduleType === 'recurring' && form.recurrenceDays.length)
                            ? form.recurrenceDays.join(', ')
                            : null,
      time_start:         form.timeStart || null,
      time_end:           form.timeEnd || null,
      recurrence_days:    form.recurrenceDays.length ? form.recurrenceDays : null,
      one_time_date:      form.oneTimeDate || null,
      price:              form.isFree ? 0 : (form.price !== '' ? Number(form.price) : null),
      stroller_accessible: form.strollerAccessible === 'yes' ? true
                           : form.strollerAccessible === 'no' ? false : null,
      age_range:          form.ageRange.length ? form.ageRange : null,
      language:           form.language || null,
      organizer_name:     form.organizerName.trim() || null,
      organizer_whatsapp: form.organizerWhatsapp.trim() || null,
      organizer_instagram:form.organizerInstagram.trim() || null,
    });

    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose bg-white';
  const chip = (active) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-dusty-rose border-dusty-rose text-white'
        : 'border-stone-200 text-stone-600 bg-white'
    }`;

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-cream-50 flex flex-col items-center justify-center px-6 text-center max-w-xl mx-auto">
        <div className="text-5xl mb-4">🌸</div>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Thanks for submitting!</h2>
        <p className="text-sm text-stone-500 mb-6 max-w-xs">
          We'll review your activity and publish it within 24 hours.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-2xl bg-dusty-rose text-white text-sm font-semibold"
        >
          Back to MamaOut
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-cream-50 flex flex-col max-w-xl mx-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center px-4 pt-4 pb-3 bg-white border-b border-stone-100">
        <button onClick={onClose} className="p-2 -ml-2 text-stone-400 active:text-stone-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="flex-1 text-center text-base font-semibold text-stone-800">Submit your activity</h2>
        <div className="w-9" />
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">

        {/* About */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">About the activity</p>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Activity name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Baby yoga with Shira"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">
              Description
              <span className="text-stone-300 font-normal ml-1">({form.description.length}/300)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value.slice(0, 300))}
              placeholder="What should moms know about this activity?"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => set('category', c)} className={chip(form.category === c)}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Location</p>
          <input
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Street address or venue name"
            className={inputCls}
          />
          <input
            value={form.neighborhood}
            onChange={e => set('neighborhood', e.target.value)}
            placeholder="Neighborhood (e.g. Florentin, Ramat Gan)"
            className={inputCls}
          />
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Schedule</p>
          <div className="flex flex-wrap gap-2">
            {[['Recurring', 'recurring'], ['One-time', 'one-time'], ['Drop-in', 'drop-in']].map(([label, val]) => (
              <button key={val} onClick={() => set('scheduleType', val)} className={chip(form.scheduleType === val)}>
                {label}
              </button>
            ))}
          </div>

          {form.scheduleType === 'recurring' && (
            <div>
              <label className="text-xs text-stone-500 block mb-2">Days of week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)} className={chip(form.recurrenceDays.includes(d))}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {form.scheduleType === 'one-time' && (
            <div>
              <label className="text-xs text-stone-500 block mb-1.5">Date</label>
              <input
                type="date"
                value={form.oneTimeDate}
                onChange={e => set('oneTimeDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
            </div>
          )}

          {form.scheduleType && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-stone-500 block mb-1.5">Start time</label>
                <input type="time" value={form.timeStart} onChange={e => set('timeStart', e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-stone-500 block mb-1.5">End time</label>
                <input type="time" value={form.timeEnd} onChange={e => set('timeEnd', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Pricing</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={e => set('isFree', e.target.checked)}
              className="w-4 h-4 rounded accent-dusty-rose"
            />
            <span className="text-sm text-stone-600">This activity is free</span>
          </label>
          {!form.isFree && (
            <div className="flex items-center gap-2">
              <span className="text-stone-400 text-sm font-medium">₪</span>
              <input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="Price per session"
                min="0"
                className={`${inputCls} flex-1`}
              />
            </div>
          )}
        </div>

        {/* Baby details */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Baby details</p>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">Stroller accessible?</label>
            <div className="flex gap-2">
              {STROLLER_OPTS.map(o => (
                <button key={o.key} onClick={() => set('strollerAccessible', o.key)} className={chip(form.strollerAccessible === o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">Baby age range (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map(r => (
                <button key={r} onClick={() => toggleAge(r)} className={chip(form.ageRange.includes(r))}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">Language</label>
            <div className="flex gap-2">
              {LANGUAGES.map(l => (
                <button key={l} onClick={() => set('language', l)} className={chip(form.language === l)}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">About you</p>
          <input
            value={form.organizerName}
            onChange={e => set('organizerName', e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
          <input
            type="tel"
            value={form.organizerWhatsapp}
            onChange={e => set('organizerWhatsapp', e.target.value)}
            placeholder="WhatsApp number (e.g. 050-1234567)"
            className={inputCls}
          />
          <input
            value={form.organizerInstagram}
            onChange={e => set('organizerInstagram', e.target.value)}
            placeholder="Instagram handle (optional)"
            className={inputCls}
          />
        </div>

        {error && <p className="text-xs text-red-500 px-1">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || !form.name.trim()}
          className="w-full py-3.5 rounded-2xl bg-dusty-rose text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {submitting ? 'Submitting…' : 'Submit activity'}
        </button>

        <p className="text-xs text-stone-400 text-center pb-4">
          We review all submissions before publishing. Usually within 24 hours.
        </p>
      </div>
    </div>
  );
}
