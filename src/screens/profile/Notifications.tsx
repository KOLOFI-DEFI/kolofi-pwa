import { useState } from 'react'
import { useNavigate } from 'react-router'
import { clock, dateTime, shortAddress, shortDate, weekday } from '@/core/format'
import type { AppNotification, NotificationCategory } from '@/core/types'
import type { IconName } from '@/core/icons'
import { useMarkAllRead, useMarkRead, useNotifications } from '@/core/data'
import { Button, EmptyState, FilterChips, Header, HeaderLink, Icon, Screen, Skeleton, Tile, cx, errorText, useIsDesktop, useToast } from '@/ui'
import { Dialog } from './Dialog'
import n from './notifications.module.css'

/* ═════════ Notifications (board 18) ═════════ */
type Filter = 'all' | NotificationCategory
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'savings', label: 'Savings' },
  { value: 'security', label: 'Security' },
]
const categoryLabel: Record<NotificationCategory, string> = { transactions: 'Transactions', savings: 'Savings & circles', security: 'Security' }

/** Where a notification leads, from the ids in its `details`. */
function targetOf(item: AppNotification): { to: string; label: string } | null {
  const d = item.details
  const str = (k: string) => (typeof d[k] === 'string' && d[k] ? (d[k] as string) : null)
  const circle = str('circle_id')
  if (circle) return { to: `/circles/${circle}`, label: 'Open circle' }
  const plan = str('plan_id') ?? str('savings_plan_id')
  if (plan) return { to: `/save/${plan}`, label: 'Open plan' }
  const withdrawal = str('crypto_withdrawal_id') ?? str('withdrawal_id')
  if (withdrawal) return { to: `/wallet/withdrawals/${withdrawal}`, label: 'View withdrawal' }
  return null
}

function look(item: AppNotification): { icon: IconName; tone: 'neutral' | 'sig' | 'chain' | 'flare' } {
  if (item.category === 'security') return { icon: 'shield', tone: 'flare' }
  if (/circle/i.test(item.type)) return { icon: 'circles', tone: 'chain' }
  if (item.category === 'savings') return { icon: 'vault', tone: 'sig' }
  if (/withdraw/i.test(item.type)) return { icon: 'arrowUpRight', tone: 'neutral' }
  if (/deposit/i.test(item.type)) return { icon: 'arrowDownLeft', tone: 'sig' }
  return { icon: 'wallet', tone: 'neutral' }
}

type Group = 'today' | 'week' | 'earlier'
const groupLabels: Record<Group, string> = { today: 'Today', week: 'This week', earlier: 'Earlier' }
function groupOf(iso: string, now = new Date()): Group {
  const d = new Date(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= startOfToday) return 'today'
  if (d.getTime() >= startOfToday - 6 * 86_400_000) return 'week'
  return 'earlier'
}
const when = (item: AppNotification, g: Group) => (g === 'today' ? clock(item.created_at) : g === 'week' ? weekday(item.created_at) : shortDate(item.created_at))

export function Notifications() {
  const nav = useNavigate()
  const toast = useToast()
  const twoPane = useIsDesktop(1100)
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isError, error, refetch } = useNotifications()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [opened, setOpened] = useState<AppNotification | null>(null)

  const shown = (items ?? []).filter((x) => filter === 'all' || x.category === filter)
  const unread = (items ?? []).filter((x) => !x.read_at).length
  const selected = shown.find((x) => x.id === selectedId) ?? shown[0] ?? null
  const groups = (['today', 'week', 'earlier'] as Group[])
    .map((g) => ({ key: g, items: shown.filter((x) => groupOf(x.created_at) === g) }))
    .filter((g) => g.items.length > 0)

  const readAll = () => markAll.mutate(undefined, { onSuccess: () => toast('All caught up'), onError: (e) => toast(errorText(e)) })
  const read = (item: AppNotification) => {
    if (!item.read_at) markRead.mutate(item.id)
  }
  const open = (item: AppNotification) => {
    read(item)
    if (twoPane) {
      setSelectedId(item.id)
      return
    }
    const target = targetOf(item)
    if (target) nav(target.to)
    else setOpened(item)
  }

  return (
    <Screen
      tabs
      header={
        <Header
          title="Notifications"
          sub={items && (unread ? `${unread} unread` : 'All caught up')}
          right={
            <>
              <span className={n.phoneOnly}>
                <HeaderLink onClick={readAll}>Read all</HeaderLink>
              </span>
              <Button variant="outline" icon="check" className={n.deskBtn} disabled={!unread} loading={markAll.isPending} onClick={readAll}>
                Mark all read
              </Button>
            </>
          }
        />
      }
    >
      <div className={n.filters}>
        <FilterChips options={filters} value={filter} onChange={setFilter} />
      </div>

      <div className={n.layout}>
        <div className={n.list}>
          {!items && !isError && (
            <div className={n.skel}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h={56} />
              ))}
            </div>
          )}
          {isError && (
            <EmptyState icon="info" title="Couldn’t load notifications" action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}>
              {errorText(error)}
            </EmptyState>
          )}
          {items && shown.length === 0 && (
            <EmptyState icon="bell" title={filter === 'all' ? 'No notifications yet' : `No ${filters.find((f) => f.value === filter)?.label.toLowerCase()} notifications`}>
              We’ll let you know about deposits, savings, circles and sign-ins here.
            </EmptyState>
          )}
          {groups.map((g) => (
            <section key={g.key} className={n.group}>
              <h2 className={n.groupTitle}>{groupLabels[g.key]}</h2>
              <div className={n.card}>
                {g.items.map((item) => {
                  const l = look(item)
                  return (
                    <button
                      key={item.id}
                      className={cx(n.item, !item.read_at && n.unread, twoPane && selected?.id === item.id && n.active)}
                      onClick={() => open(item)}
                      aria-current={twoPane && selected?.id === item.id ? 'true' : undefined}
                    >
                      <Tile tone={l.tone} size={40} radius={12}>
                        <Icon name={l.icon} size={17} />
                      </Tile>
                      <span className={n.itemMain}>
                        <span className={n.itemTitle}>{item.title}</span>
                        <span className={n.itemBody}>{item.body}</span>
                      </span>
                      <span className={n.itemSide}>
                        <span className={n.itemWhen}>{when(item, g.key)}</span>
                        {!item.read_at && <span className={n.dot} aria-label="Unread" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          {hasNextPage && (
            <Button variant="outline" className={n.more} loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
              Load older
            </Button>
          )}
        </div>

        {/* Desktop reading pane */}
        <aside className={n.pane}>{selected ? <Detail item={selected} /> : <EmptyState icon="bell" title="Nothing selected">Pick a notification to read it here.</EmptyState>}</aside>
      </div>

      <Dialog open={!!opened} onClose={() => setOpened(null)} title={opened?.title ?? ''} footer={<Button variant="secondary" onClick={() => setOpened(null)}>Close</Button>}>
        {opened && <Detail item={opened} compact />}
      </Dialog>
    </Screen>
  )
}

function Detail({ item, compact }: { item: AppNotification; compact?: boolean }) {
  const nav = useNavigate()
  const l = look(item)
  const target = targetOf(item)
  const txHash = typeof item.details.tx_hash === 'string' ? item.details.tx_hash : null
  return (
    <div className={cx(n.detail, compact && n.detailCompact)}>
      {!compact && (
        <>
          <div className={n.detailTop}>
            <Tile tone={l.tone} size={52} radius={16}>
              <Icon name={l.icon} size={22} />
            </Tile>
            <span className={n.detailCat}>{categoryLabel[item.category]}</span>
          </div>
          <h2 className={n.detailTitle}>{item.title}</h2>
        </>
      )}
      <div className={n.detailWhen}>{dateTime(item.created_at)}</div>
      <p className={n.detailBody}>{item.body}</p>
      {txHash && (
        <div className={n.detailRef}>
          <span>Transaction hash</span>
          <span className="mono">{shortAddress(txHash, 10, 8)}</span>
        </div>
      )}
      {target && (
        <Button className={n.detailBtn} icon="arrowUpRight" onClick={() => nav(target.to)}>
          {target.label}
        </Button>
      )}
    </div>
  )
}
