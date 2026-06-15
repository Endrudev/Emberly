import React from 'react';
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';

import { WIDGET_PAGE_SIZE } from './widgetTypes';
import type { WidgetActivityData, WidgetData, WidgetWeekDay } from './widgetTypes';

// ── Feature flags ─────────────────────────────────────────────────────────────
// "Ochrana série" je plánovaná placená funkce. V designu je vidět, takže ji
// zobrazujeme jako (nefunkční) vizuál. Vypni přepnutím na false.
const SHOW_SHIELD = true;
// "Osobní rekord" badge — prozatím vypnuto
const SHOW_PERSONAL_RECORD = false;

// ── Colour tokens (z design mockupu) ──────────────────────────────────────────
const C = {
  white: '#FFFFFF' as const,
  card: '#FFFFFF' as const,

  green: '#34C759' as const,
  greenPale: '#C9EFD3' as const,

  orange: '#FF8C42' as const,
  peachBg: '#FFE9D9' as const,
  peachText: '#F2802A' as const,

  blueBg: '#E7F0FE' as const,
  blueText: '#4C8DF0' as const,

  ringTrack: '#F1EDF3' as const,

  track: '#E6E8EC' as const,

  textPrimary: '#23262B' as const,
  textSecondary: '#9AA0A8' as const,
  textTertiary: '#B6BBC2' as const,
};

// ── Colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): `#${string}` {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** mix `hex` toward `target` by amount 0..1 */
function mix(hex: string, target: string, amt: number): `#${string}` {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex(
    r1 + (r2 - r1) * amt,
    g1 + (g2 - g1) * amt,
    b1 + (b2 - b1) * amt
  );
}

const lighten = (hex: string, amt: number) => mix(hex, '#FFFFFF', amt);
const darken = (hex: string, amt: number) => mix(hex, '#000000', amt);
const pale = (hex: string) => mix(hex, '#FFFFFF', 0.84);

// ── SVG fire icon (StreakTabIcon path, same design as tab bar) ────────────────

function buildFireSvg(color: string): string {
  return (
    `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">` +
    `<path fill="${color}" stroke="${color}" stroke-width="1" ` +
    `d="M22.5 43.125C26.2296 43.125 29.8065 41.6434 32.4437 39.0062C35.0809 36.369 36.5625 32.7921 36.5625 29.0625C36.5625 27.4388 36.1312 25.8806 35.625 24.4312C32.4994 27.5194 30.1256 29.0625 28.5 29.0625C35.9906 15.9375 31.875 10.3125 20.625 2.8125C21.5625 12.1875 15.3825 16.4512 12.8662 18.8194C10.8137 20.75 9.38856 23.2528 8.77552 26.0031C8.16248 28.7535 8.38985 31.6245 9.42814 34.2441C10.4664 36.8637 12.2678 39.1109 14.5986 40.6945C16.9294 42.278 19.6822 43.1248 22.5 43.125ZM23.8312 9.81563C29.9081 14.9719 29.9381 18.9787 25.2431 27.2044C23.8162 29.7037 25.6219 32.8125 28.5 32.8125C29.79 32.8125 31.095 32.4375 32.4731 31.6969C32.0646 33.24 31.3035 34.6672 30.2497 35.8661C29.1958 37.065 27.8781 38.0029 26.4001 38.606C24.9222 39.2091 23.3244 39.4608 21.7327 39.3414C20.1409 39.222 18.5986 38.7347 17.2271 37.9179C15.8557 37.1012 14.6926 35.9771 13.8294 34.6344C12.9662 33.2917 12.4265 31.7669 12.2528 30.1802C12.079 28.5934 12.276 26.988 12.8282 25.4903C13.3804 23.9926 14.2728 22.6436 15.435 21.5494C15.6712 21.3281 16.8694 20.265 16.9219 20.2181C17.7169 19.5056 18.3712 18.8737 19.0181 18.1819C21.3244 15.7106 22.9819 12.9694 23.8294 9.81563H23.8312Z"/>` +
    `</svg>`
  );
}

// ── SVG gradient arc for streak ring ──────────────────────────────────────────

function buildStreakSvg(progress: number): string {
  const r = 43;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0.02, Math.min(1, progress)) * circumference;

  return (
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">` +
    `<defs>` +
    `<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">` +
    `<stop offset="0%" stop-color="#FFB45C"/>` +
    `<stop offset="100%" stop-color="#FB7A2B"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F1EDF3" stroke-width="9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#g)" stroke-width="9"` +
    ` stroke-dasharray="${filled.toFixed(2)} ${circumference.toFixed(2)}"` +
    ` stroke-linecap="round"` +
    ` transform="rotate(-90 ${cx} ${cy})"/>` +
    `</svg>`
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

interface Props {
  data: WidgetData;
}

export function MissionWidget({ data }: Props) {
  if (data.allCompletedToday) return <CelebrationWidget data={data} />;
  return <NormalWidget data={data} />;
}

// ── Normal state ──────────────────────────────────────────────────────────────

function NormalWidget({ data }: Props) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.card,
        borderRadius: 30,
        paddingHorizontal: 18,
        paddingVertical: 14,
        justifyContent: 'space-around',
      }}
    >
      <StreakSection data={data} />
      <ActivityGrid
        activities={data.activities}
        todayIso={data.todayIso}
        page={data.page}
        totalPages={data.totalPages}
      />
      <DayTracker weekDays={data.weekDays} />
    </FlexWidget>
  );
}

// ── Streak section ────────────────────────────────────────────────────────────

function StreakSection({ data }: Props) {
  const headline = data.currentStreak > 0 ? 'Nejdelší série!' : 'Začni sérii dnes!';
  const subline =
    data.daysToNextBadge === 0
      ? `Odznak „${data.nextBadgeTarget}" získán! 🏆`
      : `Ještě ${data.daysToNextBadge} dny do odznaku „${data.nextBadgeTarget}"`;

  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
      {/* Orange gradient arc ring */}
      <OverlapWidget style={{ width: 104, height: 104 }}>
        <SvgWidget
          svg={buildStreakSvg(data.progressToNextBadge)}
          style={{ width: 104, height: 104 }}
        />
        <FlexWidget
          style={{
            width: 104,
            height: 104,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgWidget svg={buildFireSvg(C.orange)} style={{ width: 28, height: 28 }} />
          <TextWidget
            text={String(data.currentStreak)}
            style={{ fontSize: 29, fontWeight: 'bold', color: C.textPrimary }}
          />
          {/* <TextWidget text="dní" style={{ fontSize: 11, color: C.textSecondary }} /> */}
        </FlexWidget>
      </OverlapWidget>

      {/* Right info column */}
      <FlexWidget style={{ flex: 1, marginLeft: 16 }}>
        {SHOW_PERSONAL_RECORD && data.isPersonalRecord && (
          <FlexWidget
            style={{
              backgroundColor: C.peachBg,
              borderRadius: 16,
              paddingHorizontal: 11,
              paddingVertical: 5,
              width: 'wrap_content',
              marginBottom: 8,
            }}
          >
            <TextWidget
              text="🎉 Osobní rekord"
              style={{ color: C.peachText, fontSize: 12.5, fontWeight: 'bold' }}
            />
          </FlexWidget>
        )}

        <TextWidget
          text={headline}
          style={{ fontSize: 21, color: C.textPrimary, fontWeight: 'bold' }}
          maxLines={1}
        />
        <TextWidget
          text={subline}
          style={{ fontSize: 14, color: C.textSecondary, fontWeight: 'bold', marginTop: 4 }}
          maxLines={2}
          truncate="END"
        />

        {SHOW_SHIELD && (
          <FlexWidget
            style={{
              backgroundColor: C.blueBg,
              borderRadius: 16,
              paddingHorizontal: 11,
              paddingVertical: 6,
              width: 'wrap_content',
              marginTop: 10,
            }}
          >
            <TextWidget
              text="📦 Ochrana série 1×"
              style={{ color: C.blueText, fontSize: 12.5, fontWeight: 'bold' }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

// ── Activity grid — čtvercové dlaždice + bar nad každým návykem ─────────────────

const TILE = 58;
const BADGE = 22;
const BADGE_EXT = Math.round(BADGE / 2); // 11 — přesah badge za roh dlaždice
const TILE_SLOT = TILE + BADGE_EXT;       // 69 — šířka slotu vč. badge overflow

function ActivityGrid({
  activities,
  todayIso,
  page,
  totalPages,
}: {
  activities: WidgetActivityData[];
  todayIso: string;
  page: number;
  totalPages: number;
}) {
  if (activities.length === 0) {
    return (
      <FlexWidget
        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16, width: 'match_parent' }}
      >
        <TextWidget
          text="Dnes žádné aktivity 🎉"
          style={{ fontSize: 14, color: C.textSecondary }}
        />
      </FlexWidget>
    );
  }

  // Doplníme prázdná místa, aby dlaždice držely stejnou velikost/pozici na všech stránkách
  const slots: (WidgetActivityData | null)[] = [...activities];
  while (slots.length < WIDGET_PAGE_SIZE) slots.push(null);

  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', alignItems: 'center' }}>
      {/* Řádek čtvercových dlaždic (aktuální stránka) */}
      <FlexWidget
        style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}
      >
        {slots.map((activity, i) =>
          activity ? (
            <ActivityTile
              key={String(activity.id)}
              activity={activity}
              todayIso={todayIso}
              page={page}
            />
          ) : (
            <FlexWidget key={`ph${i}`} style={{ width: TILE, height: 1 }} />
          ),
        )}
      </FlexWidget>

      {/* Stránkování šipkami — jen když je víc než jedna stránka */}
      {totalPages > 1 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'match_parent',
            marginTop: 12,
          }}
        >
          <PageArrow label="‹" targetPage={page - 1} enabled={page > 0} todayIso={todayIso} />
          <TextWidget
            text={`${page + 1}/${totalPages}`}
            style={{
              fontSize: 12.5,
              color: C.textSecondary,
              fontWeight: 'bold',
              marginLeft: 16,
              marginRight: 16,
            }}
          />
          <PageArrow
            label="›"
            targetPage={page + 1}
            enabled={page < totalPages - 1}
            todayIso={todayIso}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function PageArrow({
  label,
  targetPage,
  enabled,
  todayIso,
}: {
  label: string;
  targetPage: number;
  enabled: boolean;
  todayIso: string;
}) {
  if (!enabled) {
    return (
      <FlexWidget
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: C.track,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text={label} style={{ fontSize: 18, color: C.white, fontWeight: 'bold' }} />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: C.greenPale,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      clickAction="WIDGET_PAGE"
      clickActionData={{ page: targetPage, date: todayIso }}
    >
      <TextWidget text={label} style={{ fontSize: 18, color: C.green, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}

function ActivityTile({
  activity,
  todayIso,
  page,
}: {
  activity: WidgetActivityData;
  todayIso: string;
  page: number;
}) {
  const color = activity.color;
  const done = activity.isCompleted;

  return (
    <FlexWidget
      style={{ alignItems: 'flex-start', width: TILE_SLOT }}
      clickAction="TOGGLE_ACTIVITY"
      clickActionData={{ activityId: activity.id, date: todayIso, page }}
      accessibilityLabel={`${activity.name}: ${done ? 'splněno' : 'nesplněno'}`}
    >
      {/* Bar — stejně široký jako dlaždice, zarovnaný vlevo */}
      <FlexWidget
        style={{
          width: TILE,
          height: 8,
          borderRadius: 4,
          backgroundColor: done ? C.green : C.track,
          marginBottom: 8,
        }}
      />

      {/* OverlapWidget přesahuje o BADGE_EXT doprava a dolů — badge tak vyčnívá za roh */}
      <OverlapWidget style={{ width: TILE_SLOT, height: TILE_SLOT }}>
        {/* Dlaždice TILE×TILE v levém horním rohu OverlapWidget */}
        <FlexWidget
          style={{
            width: TILE,
            height: TILE,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            ...(done
              ? {
                  backgroundGradient: {
                    from: lighten(color, 0.16),
                    to: darken(color, 0.04) as `#${string}`,
                    orientation: 'TL_BR' as const,
                  },
                }
              : { backgroundColor: pale(color) }),
          }}
        >
          <TextWidget text={activity.emoji} style={{ fontSize: 28 }} />
        </FlexWidget>

        {/* Badge overlay TILE_SLOT×TILE_SLOT — badge v pravém dolním rohu přesahuje dlaždici o BADGE_EXT */}
        {done && (
          <FlexWidget
            style={{
              width: TILE_SLOT,
              height: TILE_SLOT,
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}
          >
            <FlexWidget
              style={{
                width: BADGE,
                height: BADGE,
                borderRadius: BADGE / 2,
                backgroundColor: C.green,
                borderWidth: 2,
                borderColor: C.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget
                text="✓"
                style={{ color: C.white, fontSize: 11, fontWeight: 'bold' }}
              />
            </FlexWidget>
          </FlexWidget>
        )}
      </OverlapWidget>

      {/* Popisek */}
      <TextWidget
        text={activity.name.length > 7 ? activity.name.slice(0, 7) + '…' : activity.name}
        style={{
          width: TILE,
          fontSize: 12,
          color: done ? C.textPrimary : C.textTertiary,
          fontWeight: 'bold',
          marginTop: 5,
          textAlign: 'center',
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

// ── Day tracker ───────────────────────────────────────────────────────────────

function DayTracker({ weekDays }: { weekDays: WidgetWeekDay[] }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
      {weekDays.map((day, i) => {
        const bg = day.isCompleted
          ? C.green
          : day.isToday
            ? C.greenPale
            : C.track;
        return (
          <FlexWidget key={String(i)} style={{ flex: 1, alignItems: 'center' }}>
            <TextWidget
              text={day.label}
              style={{
                fontSize: 10.5,
                color: day.isToday ? C.green : C.textTertiary,
                fontWeight: day.isToday ? 'bold' : 'normal',
                marginBottom: 5,
              }}
            />
            <FlexWidget
              style={{
                width: 23,
                height: 23,
                borderRadius: 12,
                backgroundColor: bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {day.isCompleted && (
                <TextWidget
                  text="✓"
                  style={{ color: C.white, fontSize: 12, fontWeight: 'bold' }}
                />
              )}
            </FlexWidget>
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}

// ── Celebration state ─────────────────────────────────────────────────────────

function CelebrationWidget({ data }: Props) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.green,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      clickAction="WIDGET_CLICK"
      clickActionData={{ date: data.todayIso, page: 0 }}
    >
      <TextWidget text="🎉" style={{ fontSize: 48 }} />
      <TextWidget
        text="Skvělá práce!"
        style={{ fontSize: 23, color: C.white, fontWeight: 'bold', marginTop: 8 }}
      />
      <TextWidget
        text="Dnes máš vše splněno"
        style={{ fontSize: 14, color: C.white, marginTop: 4 }}
      />

      {data.currentStreak > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 22,
          }}
        >
          <TextWidget text="🔥" style={{ fontSize: 20 }} />
          <TextWidget
            text={`  ${String(data.currentStreak)} dní v sérii`}
            style={{ fontSize: 15, color: C.white, fontWeight: 'bold' }}
          />
        </FlexWidget>
      )}

      <FlexWidget style={{ flexDirection: 'row', marginTop: 20 }}>
        {data.weekDays.map((day, i) => (
          <FlexWidget
            key={String(i)}
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: day.isCompleted ? C.white : 'rgba(255, 255, 255, 0.35)',
              marginRight: i < 6 ? 7 : 0,
            }}
          />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
