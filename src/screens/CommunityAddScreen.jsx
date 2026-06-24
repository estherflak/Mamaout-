import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

const CATEGORIES = ['Movement', 'Wellness', 'Baby-focused', 'Social', 'Creative'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY = {
  name: '',
  city: 'Tel Aviv',
  neighborhood: '',
  isRecurring: false,
  recurrenceDays: [],
  date: '',
  timeStart: '',
  timeEnd: '',
  isFree: true,
  price: '',
  sourceUrl: '',
  notes: '',
  category: '',
};

export default function CommunityAddScreen({ onClose }) {
  const { user, profile } = useAuthContext();
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

  async function submit() {
    if (!form.name.trim())         { setError('Activity name is required.'); return; }
    if (!form.neighborhood.trim()) { setError('Please add a neighborhood or location.'); return; }
    if (!supabase)                 { setError('Not connected to database.'); return; }
    setError('');
    setSubmitting(true);

    const scheduleType  = form.isRecurring ? 'recurring' : (form.date ? 'one-time' : null);
    const scheduleLabel = form.isRecurring && form.recurrenceDays.length
      ? form.recurrenceDays.join(', ')
      : null;

    const { error: err } = await supabase.from('submissions').insert({
      name:            form.name.trim(),
      description:     form.notes.trim() || null,
      category:        form.category || null,
      neighborhood:    form.neighborhood.trim(),
      address:         [form.neighborhood.trim(), form.city].join(', '),
      schedule_type:   scheduleType,
      schedule_label:  scheduleLabel,
      time_start:      form.timeStart || null,
      time_end:        form.timeEnd   || null,
      recurrence_days: form.isRecurring && form.recurrenceDays.length ? form.recurrenceDays : null,
      one_time_date:   !form.isRecurring && form.date ? form.date : null,
      price:           form.isFree ? 0 : (form.price !== '' ? Number(form.price) : null),
      organizer_name:  profile?.name || null,
      source_url:      form.sourceUrl.trim() || null,
      submission_type: 'community',
      submitted_by:    user?.id || null,
    });

    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose bg-white';
  const chip = active =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-dusty-rose border-dusty-rose text-white'
        : 'border-stone-200 text-stone-600 bg-white'
    }`;

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-cream-50 flex flex-col items-center justify-center px-6 text-center max-w-xl mx-auto">
        <div className="text-5xl mb-4">🌸</div>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Thanks for sharing!</h2>
        <p className="text-sm text-stone-500 mb-6 max-w-xs">
          We'll review it and publish it within 24 hours so other moms can find it too.
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
        <div className="flex-1 text-center">
          <h2 className="text-base font-semibold text-stone-800">Share an activity 🌸</h2>
          <p className="text-xs text-stone-400">Help other moms discover it too</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">

        {/* Name + Category */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">What's the activity? *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Baby yoga at Florentin Studio"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => set('category', form.category === c ? '' : c)} className={chip(form.category === c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Where</p>
          <div className="flex gap-2">
            {['Tel Aviv', 'Ramat Gan'].map(c => (
              <button key={c} onClick={() => set('city', c)} className={`flex-1 ${chip(form.city === c)}`}>{c}</button>
            ))}
          </div>
          <input
            value={form.neighborhood}
            onChange={e => set('neighborhood', e.target.value)}
            placeholder="Neighborhood or venue (e.g. Florentin, HaYarkon Park) *"
            className={inputCls}
          />
        </div>

        {/* When */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">When</p>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={e => set('isRecurring', e.target.checked)}
              className="w-4 h-4 rounded accent-dusty-rose"
            />
            <span className="text-sm text-stone-600">Recurring (weekly etc.)</span>
          </label>

          {form.isRecurring ? (
            <div>
              <label className="text-xs text-stone-500 block mb-2">Which days?</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)} className={chip(form.recurrenceDays.includes(d))}>{d}</button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-stone-500 block mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={inputCls}
              />
            </div>
          )}

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
        </div>

        {/* Price */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Price</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={e => set('isFree', e.target.checked)}
              className="w-4 h-4 rounded accent-dusty-rose"
            />
            <span className="text-sm text-stone-600">It's free!</span>
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

        {/* Link + Notes */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">More info</p>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Link to register or learn more</label>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={e => set('sourceUrl', e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">
              Notes <span className="text-stone-300 font-normal">({form.notes.length}/200)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value.slice(0, 200))}
              placeholder="Anything else moms should know?"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 px-1">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || !form.name.trim()}
          className="w-full py-3.5 rounded-2xl bg-dusty-rose text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {submitting ? 'Sharing…' : 'Share with community 🌸'}
        </button>

        <p className="text-xs text-stone-400 text-center pb-4">
          We review all community tips before publishing — usually within 24 hours.
        </p>
      </div>
    </div>
  );
}
