import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { cartiaApi, getPublicParams } from "./api.js";
import { CartiaSelect } from "./components/CartiaSelect.jsx";
import {
  ArrowLeft,
  BellSimple,
  CaretDown,
  ChartLineUp,
  Check,
  CheckCircle,
  Clock,
  CloudArrowUp,
  DeviceMobile,
  DownloadSimple,
  Eye,
  FileVideo,
  ForkKnife,
  ImageSquare,
  MagnifyingGlass,
  MagicWand,
  Palette,
  PencilSimple,
  Play,
  Plus,
  QrCode,
  SpinnerGap,
  Receipt,
  SpeakerHigh,
  SpeakerSlash,
  SlidersHorizontal,
  SignOut,
  SquaresFour,
  Storefront,
  Trash,
  UploadSimple,
  UsersThree,
  VideoCamera,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

const platformOrigin = import.meta.env.VITE_PLATFORM_ORIGIN || window.location.origin;
const rootDomain = (import.meta.env.VITE_ROOT_DOMAIN || "").trim().toLowerCase();
const salesWhatsAppUrl = (import.meta.env.VITE_SALES_WHATSAPP_URL || "").trim();
const hostname = window.location.hostname.toLowerCase();
const publicReservedSubdomains = new Set(["app", "api", "www", "admin", "cartia"]);
const isRootDomain = Boolean(rootDomain) && hostname === rootDomain;
const isPlatformDomain = Boolean(rootDomain) && hostname === `app.${rootDomain}`;
const isRestaurantDomain = Boolean(rootDomain)
  && hostname.endsWith(`.${rootDomain}`)
  && !isPlatformDomain
  && !hostname.slice(0, -(rootDomain.length + 1)).includes(".")
  && !publicReservedSubdomains.has(hostname.slice(0, -(rootDomain.length + 1)));

function slugifyClient(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

const navItems = [
  { id: "inicio", label: "Inicio", icon: SquaresFour },
  { id: "carta", label: "Carta", icon: ForkKnife },
  { id: "analitica", label: "Analítica", icon: ChartLineUp },
  { id: "mesas", label: "Mesas", icon: BellSimple },
  { id: "estilo", label: "Estilo", icon: Palette },
  { id: "contenido", label: "Contenido IA", icon: MagicWand },
];

function useHashScreen() {
  const readHash = () => window.location.hash.replace("#", "") || "inicio";
  const [screen, setScreen] = useState(readHash);

  useEffect(() => {
    const handleHash = () => setScreen(readHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navigate = (next) => {
    window.location.hash = next === "inicio" ? "" : next;
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return [screen, navigate];
}

function LandingScreen() {
  return <main className="auth-page"><section className="auth-card loading-card"><span className="auth-brand">Cart<i>IA</i></span><p className="eyebrow">CARTAS DIGITALES PARA RESTAURANTES</p><h1>Tu salón, conectado.</h1><p>Menú QR, pedidos, llamados y operación en tiempo real para cada sucursal.</p><a className="primary-button full" href={platformOrigin}>Ingresar al panel</a></section></main>;
}

function MarketingLanding() {
  const message = "Hola, quiero conocer CartIA para mi restaurante.";
  const whatsappHref = salesWhatsAppUrl ? `${salesWhatsAppUrl}${salesWhatsAppUrl.includes("?") ? "&" : "?"}text=${encodeURIComponent(message)}` : "";
  const Cta = ({ className = "" }) => whatsappHref
    ? <a className={`landing-cta ${className}`.trim()} href={whatsappHref} target="_blank" rel="noreferrer">Solicitá una demo <span aria-hidden="true">↗</span></a>
    : <span className={`landing-cta is-pending ${className}`.trim()} aria-label="WhatsApp comercial próximamente">Demo por WhatsApp, próximamente</span>;

  return <main className="landing-page">
    <header className="landing-nav"><a className="landing-brand" href="/" aria-label="CartIA, inicio">Cart<i>IA</i></a><nav aria-label="Navegación de la landing"><a href="#producto">Producto</a><a href="#como-funciona">Cómo funciona</a></nav><a className="landing-login" href={platformOrigin}>Ingresar</a></header>
    <section className="landing-hero"><div className="landing-hero-copy"><p className="landing-kicker"><span /> Operación conectada para restaurantes</p><h1>Tu salón,<br /><em>en un solo lugar.</em></h1><p className="landing-lead">Una carta QR que se ve bien, pedidos que llegan al instante y un equipo que sabe qué pasa en cada mesa.</p><div className="landing-actions"><Cta /><a className="landing-text-link" href="#producto">Conocé el producto <span aria-hidden="true">↓</span></a></div><p className="landing-note">Sin instalación compleja. Configuramos tu carta y tus mesas con vos.</p></div><div className="landing-hero-art" aria-label="Vista de CartIA en un teléfono"><div className="landing-orbit landing-orbit-one" /><div className="landing-orbit landing-orbit-two" /><div className="landing-phone"><div className="landing-phone-notch" /><div className="landing-phone-screen"><div className="landing-phone-top"><span>CASA</span><span>Mesa 08</span></div><div className="landing-phone-image"><span>MENÚ DEL DÍA</span><strong>Hecho para<br />compartir.</strong><small>Deslizá para descubrir</small></div><div className="landing-phone-dish"><span><b>Plato recomendado</b><small>Ingredientes de estación</small></span><strong>$ 14.500</strong></div><div className="landing-phone-actions"><span>Ver carta</span><b>Pedir</b></div></div></div><div className="landing-float-card landing-float-order"><span className="landing-float-icon"><ForkKnife size={16} weight="fill" /></span><div><b>Nuevo pedido</b><small>Mesa 08 · recién recibido</small></div><CheckCircle size={17} weight="fill" /></div><div className="landing-float-card landing-float-qr"><QrCode size={27} weight="bold" /><span>Un QR<br />por mesa</span></div></div></section>
    <section className="landing-proof"><p>Una experiencia clara para quien se sienta. Una operación simple para quien la atiende.</p><div><span>MENÚ QR</span><i /> <span>PEDIDOS EN VIVO</span><i /> <span>LLAMADOS DE MESA</span><i /> <span>UNA O MÁS SUCURSALES</span></div></section>
    <section className="landing-product" id="producto"><div className="landing-section-heading"><p className="eyebrow">UNA HERRAMIENTA, DOS EXPERIENCIAS</p><h2>Lo que el cliente ve.<br /><em>Lo que tu equipo necesita.</em></h2></div><div className="landing-showcase-grid"><article className="landing-showcase landing-showcase-menu"><div className="landing-showcase-copy"><span className="landing-number">01</span><p className="eyebrow">MENÚ QUE INVITA A PEDIR</p><h3>Tu carta, con la identidad de tu local.</h3><p>Fotos, videos, categorías, precios y disponibilidad que actualizás desde el panel.</p></div><div className="landing-menu-preview" aria-hidden="true"><div className="landing-menu-preview-top"><span>CASA</span><span>MENÚ</span></div><div className="landing-menu-preview-image"><Play size={18} weight="fill" /><strong>Sabores que<br />dan ganas de quedarse.</strong></div><div className="landing-menu-preview-tabs"><b>Recomendados</b><span>Entradas</span><span>Principales</span></div></div></article><article className="landing-showcase landing-showcase-panel"><div className="landing-panel-preview" aria-hidden="true"><header><span className="landing-mini-brand">Cart<i>IA</i></span><b>2 operaciones pendientes</b></header><div className="landing-panel-body"><aside><span className="active">Inicio</span><span>Carta</span><span>Mesas</span></aside><main><div className="landing-panel-title"><p>SALA EN VIVO</p><strong>Todo bajo control.</strong></div><div className="landing-order-row"><span className="landing-status-dot" /><div><b>Mesa 08</b><small>Pedido nuevo · 3 platos</small></div><em>Ver pedido</em></div><div className="landing-order-row"><span className="landing-bell"><BellSimple size={13} weight="fill" /></span><div><b>Mesa 03</b><small>Solicita la cuenta</small></div><em>Resolver</em></div></main></div></div><div className="landing-showcase-copy"><span className="landing-number">02</span><p className="eyebrow">SALÓN EN TIEMPO REAL</p><h3>Pedidos y llamados, sin perder una mesa de vista.</h3><p>El equipo recibe cada operación y la resuelve desde un tablero pensado para el ritmo del servicio.</p></div></article></div></section>
    <section className="landing-flow" id="como-funciona"><div className="landing-section-heading"><p className="eyebrow">DEL QR A LA MESA</p><h2>Simple para tus clientes.<br /><em>Natural para tu equipo.</em></h2></div><ol><li><span>01</span><QrCode size={28} weight="light" /><h3>Escanean</h3><p>Cada mesa tiene su propio QR, único y listo para imprimir.</p></li><li><span>02</span><DeviceMobile size={28} weight="light" /><h3>Eligen y piden</h3><p>Exploran la carta visual, hacen un pedido o llaman al mozo.</p></li><li><span>03</span><BellSimple size={28} weight="light" /><h3>Tu salón responde</h3><p>El pedido aparece en vivo y el equipo acompaña cada estado.</p></li></ol></section>
    <section className="landing-capabilities"><div><p className="eyebrow">PENSADO PARA EL DÍA A DÍA</p><h2>La tecnología se adapta<br />a tu restaurante.</h2></div><ul><li><CheckCircle size={18} weight="fill" /> Carta, categorías y precios editables</li><li><CheckCircle size={18} weight="fill" /> Fotos y videos para mostrar cada plato</li><li><CheckCircle size={18} weight="fill" /> Mesas QR únicas y no adivinables</li><li><CheckCircle size={18} weight="fill" /> Pedidos, llamados y estados de servicio</li><li><CheckCircle size={18} weight="fill" /> Operación por sucursal desde una misma cuenta</li></ul></section>
    <section className="landing-final"><div><p className="eyebrow">CARTIA PARA TU RESTAURANTE</p><h2>Hagamos que cada<br /><em>mesa cuente.</em></h2><p>Conocé cómo CartIA puede ordenar el salón y hacer que tu carta trabaje mejor.</p><Cta className="landing-cta-light" /></div><div className="landing-final-mark"><span>Cart<i>IA</i></span><small>CARTA · SALÓN · SERVICIO</small></div></section>
    <footer className="landing-footer"><a className="landing-brand" href="/">Cart<i>IA</i></a><span>Herramientas simples para restaurantes que cuidan su experiencia.</span><a href={platformOrigin}>Acceso al panel</a></footer>
  </main>;
}

function initials(value, fallback = "") {
  const letters = (value || "").trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return letters || fallback;
}

function relativeTime(value) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return "Recién recibido";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Recién recibido";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

function AppHeader({ onRequests, user, activeLocationId, onSelectLocation, operations, onLogout }) {
  const locations = user?.locations || [];
  const active = locations.find((location) => location.id === activeLocationId) || locations[0];
  const pendingCount = operations.length;
  return (
    <header className="app-header">
      <a className="brand" href="#" aria-label="CartIA, ir al inicio">
        <span>Cart</span>
        <span className="brand-accent">IA</span>
      </a>
      {user?.role === "superadmin" && !activeLocationId ? <div className="restaurant-switch platform-context" aria-label="Contexto de plataforma">
        <span className="restaurant-mark">CA</span><span className="restaurant-copy"><small>Administración</small><strong>Plataforma · CartIA</strong></span>
      </div> : active ? <label className="restaurant-switch" aria-label="Sucursal activa">
        <span className="restaurant-mark">{initials(active.name, "—")}</span>
        <span className="restaurant-copy"><small>Sucursal activa</small><strong>{active.name}</strong></span>
        <CartiaSelect value={active?.id || ""} onChange={onSelectLocation} ariaLabel="Cambiar sucursal" options={locations.map((location) => ({ value: location.id, label: location.name }))} className="cartia-select-header" />
      </label> : null}
      <div className="header-spacer" />
      {pendingCount > 0 && <button className="pending-button" type="button" onClick={onRequests}>
        <span className="pending-pulse" />
        {pendingCount} {pendingCount === 1 ? "operación pendiente" : "operaciones pendientes"}
      </button>}
      <button className="avatar-button" type="button" aria-label="Perfil de usuario" title="Perfil de usuario">
        {initials(user?.name, "CI")}
      </button>
    </header>
  );
}

function RequestRail({ operations, onOpenRoom, onDismiss }) {
  return (
    <section className="request-rail" aria-label="Solicitudes de mesa">
      <div className="request-live">
        <span className="live-dot" />
        Sala en vivo
      </div>
      {operations.slice(0, 2).map((item) => {
        const isOrder = item.kind === "order";
        const Icon = isOrder ? ForkKnife : item.requestType === "bill" ? Receipt : BellSimple;
        const tone = isOrder ? "request-icon-order" : item.requestType === "bill" ? "request-icon-bill" : "request-icon-waiter";
        return <div className="request-item" key={`${item.kind}-${item.id}`}>
          <span className={`request-icon ${tone}`}><Icon size={18} weight="fill" /></span>
          <span><strong>{item.table}</strong><small>{item.type} · {relativeTime(item.createdAt)}</small></span>
        </div>;
      })}
      <button className="rail-action" type="button" onClick={onOpenRoom}>
        Abrir sala
      </button>
      <button className="icon-button rail-dismiss" type="button" onClick={onDismiss} aria-label="Ocultar aviso">
        <X size={18} />
      </button>
    </section>
  );
}

function Sidebar({ active, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <nav aria-label="Navegación principal">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${active === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} weight={active === id ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className={`nav-item ${active === "admin" ? "active" : ""}`}
          onClick={() => onNavigate("admin")}
        >
          <UsersThree size={19} />
          <span>Administración</span>
        </button>
        <div className="plan-card">
          <span className="plan-label">Plan Estudio</span>
          <strong>Tu carta trabaja por vos</strong>
          <small>Próxima renovación · 18 ago</small>
        </div>
        <button className="nav-item sidebar-logout" type="button" onClick={onLogout}>
          <SignOut size={19} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ active, onNavigate }) {
  const mobileItems = navItems.slice(0, 5);
  return (
    <nav className="bottom-nav" aria-label="Navegación móvil">
      {mobileItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={active === id ? "active" : ""}
          type="button"
          onClick={() => onNavigate(id)}
        >
          <Icon size={20} weight={active === id ? "fill" : "regular"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Dashboard({ period, onPeriod, onImprove, analytics }) {
  const rankedDishes = analytics?.dishes || [];
  const hasRealData = rankedDishes.length > 0;
  const maxAttention = Math.max(1, ...rankedDishes.map((dish) => dish.averageSeconds || 0));
  const kpis = analytics?.kpis || { scans: 0, orders: 0 };
  return (
    <main className="screen dashboard-screen">
      <section className="screen-heading">
        <div>
          <p className="eyebrow">HOY · 13:42</p>
          <h1>Qué está mirando tu salón</h1>
          <p className="heading-copy">
            Insights de atención y elección de tus platos
            <span>{`${kpis.scans} escaneos · ${kpis.orders} pedidos enviados`}</span>
          </p>
        </div>
        <PeriodSelect value={period} onChange={onPeriod} />
      </section>

      <div className="dashboard-grid">
        <section className="attention-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">ATENCIÓN EN TIEMPO REAL</p>
              <h2>Platos que más detienen la mirada</h2>
            </div>
            <span className="live-pill"><span /> En vivo</span>
          </div>
          {hasRealData ? <div className="dish-list">
            {rankedDishes.slice(0, 5).map((dish, index) => (
              <article className="dish-row" key={dish.id || dish.name}>
                <span className="dish-rank">{index + 1}</span>
                {dish.image ? <img src={dish.image} alt="" loading="eager" /> : <span className="dish-rank">—</span>}
                <div className="dish-info">
                  <strong>{dish.name}</strong>
                  <small>{dish.detail || "Sin descripción"}</small>
                  <span className="attention-track"><span style={{ width: `${Math.max(5, Math.round(((dish.averageSeconds || 0) / maxAttention) * 100))}%` }} /></span>
                </div>
                <div className="dish-number"><strong>{`${dish.averageSeconds || 0} s`}</strong><small>por visita</small></div>
                <div className={`choice-number ${dish.choiceRate >= 25 ? "good" : dish.choiceRate < 15 ? "warning" : "neutral"}`}><strong>{`${dish.choiceRate || 0}%`}</strong><small>lo agrega</small></div>
              </article>
            ))}
          </div> : <div className="empty-state"><ChartLineUp size={30} /><strong>Sin actividad todavía</strong><p>Cuando tus clientes usen los QR vas a ver métricas reales de la carta.</p></div>}
        </section>

        <aside className="insight-panel">
          {hasRealData ? <><div className="insight-kicker"><MagicWand size={17} weight="fill" /> OPORTUNIDAD DETECTADA</div><h2>Usá estos datos para mejorar tu carta.</h2><p>Compará atención y agregados antes de ajustar foto, video o descripción.</p><button className="primary-button full" type="button" onClick={onImprove}><MagicWand size={17} weight="fill" /> Mejorar un plato</button></> : <div className="empty-state"><MagicWand size={30} /><strong>Las recomendaciones llegan con uso real</strong><p>Publicá tu QR y las sugerencias se basarán en la actividad de tus clientes.</p></div>}
        </aside>
      </div>
    </main>
  );
}

function PeriodSelect({ value, onChange }) {
  return (
    <label className="period-select">
      <Clock size={17} />
      <CartiaSelect value={value} onChange={onChange} ariaLabel="Período de analítica" options={["Hoy", "Últimos 7 días", "Últimos 30 días"]} className="cartia-select-filter" />
    </label>
  );
}

function CartaScreen({ menuDishes, categories, restaurant, onMenuDishes, onCategories, onToast, onOpenGuest, onSaveDish, onRemoveImage, onRemoveVideo, onArchiveDish, onReorderDishes, onSaveCategory, onArchiveCategory, onReorderCategories, onRefresh }) {
  const [category, setCategory] = useState("Recomendados");
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState("catalog");
  const [editingDish, setEditingDish] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [categoryForDish, setCategoryForDish] = useState(false);
  const activeDishes = menuDishes.filter((dish) => !dish.archived);
  const archivedDishes = menuDishes.filter((dish) => dish.archived);
  const availableDishes = activeDishes.filter((dish) => dish.available);
  const videoCount = activeDishes.filter((dish) => Boolean(dish.video)).length;
  const activeCategories = categories.filter((item) => !item.archived);
  const featuredDish = availableDishes[0];
  const previewCategories = ["Recomendados", ...activeCategories.map((item) => item.name)];

  const addItem = (name) => {
    setSelected((value) => value + 1);
    onToast(`${name} agregado a la selección`);
  };

  const openNewDish = () => {
    setEditingDish({
      id: `dish-${Date.now()}`,
      name: "",
      detail: "",
      price: "$",
      image: null,
      badge: "",
      category: activeCategories[0]?.name || "Sin categoría",
      categoryId: activeCategories[0]?.id || null,
      available: true,
      isNew: true,
    });
  };

  const saveDish = async (dish) => {
    const normalized = { ...dish, name: dish.name.trim(), detail: dish.detail.trim(), isNew: undefined };
    if (!normalized.name || !/\d/.test(normalized.price || "")) {
      onToast("Completá el nombre y el precio");
      return;
    }
    try {
      const saved = await onSaveDish(normalized);
      await onRefresh();
    } catch (error) {
      onToast(error.message || "No se pudo guardar el plato");
      return;
    }
    setEditingDish(null);
    onToast(dish.isNew ? "Plato agregado a la carta" : "Cambios guardados en la carta");
  };

  const toggleAvailability = async (id) => {
    const dish = menuDishes.find((item) => item.id === id);
    if (!dish) return;
    const nextDish = { ...dish, available: !dish.available };
    onMenuDishes((current) => current.map((item) => item.id === id ? nextDish : item));
    try {
      await onSaveDish(nextDish);
    } catch (error) {
      onMenuDishes((current) => current.map((item) => item.id === id ? dish : item));
      onToast(error.message || "No se pudo cambiar la disponibilidad");
    }
  };

  const archiveDish = async (dish, archive) => {
    if (archive && !window.confirm(`¿Archivar ${dish.name}? Se conservará el historial y podrá restaurarse.`)) return;
    try { await onArchiveDish(dish.databaseId, archive); onMenuDishes((current) => current.map((item) => item.databaseId === dish.databaseId ? { ...item, archived: archive, available: archive ? false : item.available } : item)); } catch (error) { onToast(error.message || "No se pudo actualizar el plato"); }
  };
  const moveDish = async (dish, direction) => {
    const ordered = [...activeDishes]; const index = ordered.findIndex((item) => item.databaseId === dish.databaseId); const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try { await onReorderDishes(ordered.map((item) => item.databaseId)); onMenuDishes([...ordered, ...archivedDishes]); } catch (error) { onToast(error.message || "No se pudo guardar el orden"); }
  };
  const saveCategory = async (category, name) => {
    try {
      const response = await onSaveCategory({ id: category?.id, name });
      await onRefresh();
      return response.category;
    } catch (error) {
      onToast(error.message || "No se pudo guardar la categoría");
      throw error;
    }
  };
  const archiveCategory = async (category, archive) => {
    try { await onArchiveCategory(category.id, archive); await onRefresh(); } catch (error) { onToast(error.message || "No se pudo actualizar la categoría"); throw error; }
  };
  const moveCategory = async (category, direction) => {
    const ordered = [...activeCategories]; const index = ordered.findIndex((item) => item.id === category.id); const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try { await onReorderCategories(ordered.map((item) => item.id)); onCategories((current) => [...ordered, ...current.filter((item) => item.archived)]); } catch (error) { onToast(error.message || "No se pudo guardar el orden"); }
  };

  return (
    <main className="screen carta-screen">
      <section className="carta-toolbar">
        <div>
          <p className="eyebrow">CARTA DIGITAL</p>
          <h1>Tu menú, siempre al día</h1>
          <p className="heading-copy">{availableDishes.length} platos publicados · los cambios se ven al instante.</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button mobile-preview-button" type="button" onClick={onOpenGuest}>
            <DeviceMobile size={17} />
            Vista cliente
          </button>
          <button className="primary-button" type="button" onClick={openNewDish}>
            <Plus size={17} weight="bold" />
            Nuevo plato
          </button>
        </div>
      </section>

      <div className="carta-view-switch" role="tablist" aria-label="Vista de edición">
        <button className={view === "catalog" ? "active" : ""} type="button" onClick={() => setView("catalog")}>
          <ForkKnife size={17} /> Platos
        </button>
        <button className={view === "preview" ? "active" : ""} type="button" onClick={() => setView("preview")}>
          <Eye size={17} /> Vista editorial
        </button>
        <button type="button" onClick={() => onToast("QR listo para compartir")}>
          <QrCode size={17} /> Código QR
        </button>
      </div>

      {view === "catalog" ? (
        <section className="catalog-manager">
          <div className="catalog-summary">
            <div>
              <span className="catalog-summary-icon"><ForkKnife size={21} weight="duotone" /></span>
              <div><strong>{activeDishes.length}</strong><small>Platos activos</small></div>
            </div>
            <div>
              <span className="catalog-summary-icon green"><CheckCircle size={21} weight="duotone" /></span>
              <div><strong>{availableDishes.length}</strong><small>Visibles ahora</small></div>
            </div>
            <div>
              <span className="catalog-summary-icon wine"><VideoCamera size={21} weight="duotone" /></span>
              <div><strong>{videoCount}</strong><small>Con video</small></div>
            </div>
          </div>
          <div className="catalog-list">
            <div className="catalog-list-heading">
              <div><p className="eyebrow">CATÁLOGO</p><h2>Platos publicados</h2></div>
              <span>Ordenados como los ve tu cliente</span>
            </div>
            {activeDishes.map((dish, index) => (
              <article className={`catalog-dish ${!dish.available ? "is-hidden" : ""}`} key={dish.id}>
                <img src={dish.image} alt={dish.name} />
                <div className="catalog-dish-main">
                  <div className="catalog-dish-tags">
                    <span>{dish.category}</span>
                    {dish.badge && <span>{dish.badge}</span>}
                  </div>
                  <h3>{dish.name}</h3>
                  <p>{dish.detail}</p>
                </div>
                <strong className="catalog-price">{dish.price}</strong>
                <label className="catalog-availability">
                  <input type="checkbox" checked={dish.available} onChange={() => toggleAvailability(dish.id)} />
                  <i />
                  <span>{dish.available ? "Visible" : "Oculto"}</span>
                </label>
                <button className="catalog-edit" type="button" onClick={() => setEditingDish({ ...dish, isNew: false })}>
                  <PencilSimple size={17} /> Editar
                </button>
                <button className="catalog-edit" type="button" disabled={index === 0} onClick={() => moveDish(dish, -1)}>↑</button>
                <button className="catalog-edit" type="button" disabled={index === activeDishes.length - 1} onClick={() => moveDish(dish, 1)}>↓</button>
                <button className="catalog-edit" type="button" onClick={() => archiveDish(dish, true)}>Archivar</button>
              </article>
            ))}
            {!activeDishes.length && <div className="empty-state catalog-empty"><ForkKnife size={30} /><strong>Tu carta todavía está vacía</strong><p>Agregá tu primer plato con nombre, precio y una imagen opcional.</p><button className="primary-button" type="button" onClick={openNewDish}><Plus size={17} /> Crear primer plato</button></div>}
            <div className="catalog-list-heading"><div><p className="eyebrow">CATEGORÍAS</p><h2>Orden y visibilidad</h2></div><button className="secondary-button" type="button" onClick={() => setCategoryModal({ mode: "save", category: null })}>Nueva categoría</button></div>
            {activeCategories.map((item, index) => <article className="catalog-dish" key={item.id}><div className="catalog-dish-main"><h3>{item.name}</h3><p>Orden {index + 1}</p></div><button className="catalog-edit" type="button" onClick={() => setCategoryModal({ mode: "save", category: item })}>Renombrar</button><button className="catalog-edit" type="button" disabled={index === 0} onClick={() => moveCategory(item, -1)}>↑</button><button className="catalog-edit" type="button" disabled={index === activeCategories.length - 1} onClick={() => moveCategory(item, 1)}>↓</button>{item.name !== "Sin categoría" && <button className="catalog-edit" type="button" onClick={() => setCategoryModal({ mode: "archive", category: item })}>Archivar</button>}</article>)}
            {(archivedDishes.length || categories.some((item) => item.archived)) && <div className="catalog-list-heading"><div><p className="eyebrow">ARCHIVADOS</p><h2>Restaurar contenido</h2></div></div>}
            {archivedDishes.map((dish) => <article className="catalog-dish is-hidden" key={dish.databaseId}><div className="catalog-dish-main"><h3>{dish.name}</h3><p>Plato archivado</p></div><button className="catalog-edit" type="button" onClick={() => archiveDish(dish, false)}>Restaurar</button></article>)}
            {categories.filter((item) => item.archived).map((item) => <article className="catalog-dish is-hidden" key={item.id}><div className="catalog-dish-main"><h3>{item.name}</h3><p>Categoría archivada</p></div><button className="catalog-edit" type="button" onClick={() => archiveCategory(item, false)}>Restaurar</button></article>)}
          </div>
        </section>
      ) : (
      <div className="menu-preview-shell">
        <section className="public-menu">
          <header className="public-menu-header">
            <div>
              {restaurant?.logo ? <img className="guest-brand-logo" src={restaurant.logo} alt="" /> : <span className="menu-monogram">{initials(restaurant?.name, "CI")}</span>}
              <span>
                <strong>{restaurant?.name || "Vista previa de carta"}</strong>
                <small>{restaurant?.tagline || "Los cambios se reflejan al instante"}</small>
              </span>
            </div>
            <button className="menu-search" type="button" aria-label="Buscar en la carta">
              <MagnifyingGlass size={19} />
            </button>
          </header>
          <nav className="category-tabs" aria-label="Categorías de la carta">
            {previewCategories.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </nav>

          {featuredDish && <article className="menu-hero">
            <img src={featuredDish.image} alt={featuredDish.name} />
            <div className="hero-shade" />
            <div className="hero-copy">
              <span className="chef-badge">RECOMENDACIÓN DEL CHEF</span>
              <h2>{featuredDish.name}</h2>
              <p>{featuredDish.detail}</p>
              <div>
                <strong>{featuredDish.price}</strong>
                <button type="button" onClick={() => addItem(featuredDish.name)}>
                  <Plus size={17} weight="bold" /> Agregar
                </button>
              </div>
            </div>
            <button className="edit-hotspot" type="button" onClick={() => setEditingDish({ ...featuredDish, isNew: false })}><PencilSimple size={17} /> Editar destacado</button>
          </article>}

          <div className="menu-section-heading">
            <div>
              <p className="eyebrow">PARA EMPEZAR</p>
              <h2>Elegidos para compartir</h2>
            </div>
            <span>{availableDishes.length} platos</span>
          </div>

          <div className="menu-card-grid">
            {availableDishes.slice(0, 3).map((item) => (
              <article className="menu-card" key={item.name}>
                <div className="menu-card-image">
                  <img src={item.image} alt={item.name} />
                  {item.badge && <span>{item.badge}</span>}
                  <button type="button" aria-label={`Editar ${item.name}`} onClick={() => setEditingDish({ ...item, isNew: false })}><PencilSimple size={16} /></button>
                </div>
                <div className="menu-card-copy">
                  <h3>{item.name}</h3>
                  <p>{item.detail}</p>
                  <div>
                    <strong>{item.price}</strong>
                    <button type="button" onClick={() => addItem(item.name)} aria-label={`Agregar ${item.name}`}>
                      <Plus size={18} weight="bold" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="guest-actions">
            <button type="button"><BellSimple size={18} /> Llamar al mozo</button>
            <button type="button"><Receipt size={18} /> Pedir la cuenta</button>
            {selected > 0 && <span>{selected} en selección</span>}
          </div>
        </section>

        <aside className="menu-side-panel">
          <div className="side-panel-top">
            <span className="status-dot" />
            Carta publicada
          </div>
          <h2>Tu carta está haciendo su trabajo</h2>
          <p>El diseño destaca lo que querés vender sin interrumpir la experiencia.</p>
          <div className="side-stat">
            <span>Interacción hoy</span>
            <strong>1.126</strong>
            <small>+9% vs. promedio</small>
          </div>
          <div className="side-stat">
            <span>Producto más elegido</span>
            <strong>Burrata</strong>
            <small>34% la agrega</small>
          </div>
          <div className="side-insight">
            <MagicWand size={20} weight="fill" />
            <div>
              <strong>Una mejora sugerida</strong>
              <p>Probá destacar “para compartir” en el tartar. Ese atributo convierte bien en cenas.</p>
            </div>
          </div>
          <button className="text-button" type="button" onClick={() => onToast("Sugerencia guardada para revisar")}>
            Guardar sugerencia
          </button>
        </aside>
      </div>
      )}
      {editingDish && (
        <DishEditor
          dish={editingDish}
          categories={activeCategories}
          onNewCategory={() => { setCategoryForDish(true); setCategoryModal({ mode: "save", category: null }); }}
          onRemoveImage={onRemoveImage}
          onRemoveVideo={onRemoveVideo}
          onClose={() => setEditingDish(null)}
          onSave={saveDish}
        />
      )}
      {categoryModal && <CategoryModal
        mode={categoryModal.mode}
        category={categoryModal.category}
        onClose={() => setCategoryModal(null)}
        onSave={async (name) => { const saved = await saveCategory(categoryModal.category, name); if (categoryForDish && saved) setEditingDish((dish) => dish ? { ...dish, category: saved.name, categoryId: saved.id } : dish); setCategoryForDish(false); setCategoryModal(null); }}
        onArchive={async () => { await archiveCategory(categoryModal.category, true); setCategoryModal(null); }}
      />}
    </main>
  );
}

function DishEditor({ dish, categories = [], onNewCategory, onRemoveImage, onRemoveVideo, onClose, onSave }) {
  const [draft, setDraft] = useState(dish);
  const imageInputRef = useRef(null);
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const selectMedia = (file) => {
    if (!file) return;
    if (file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4")) {
      if (file.size > 50 * 1024 * 1024) return;
      update("videoFile", file);
      update("videoName", file.name);
      return;
    }
    update("image", URL.createObjectURL(file));
    update("imageFile", file);
  };

  return (
    <div className="dish-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="dish-editor" role="dialog" aria-modal="true" aria-label={dish.isNew ? "Nuevo plato" : `Editar ${dish.name}`}>
        <header>
          <div><p className="eyebrow">{dish.isNew ? "NUEVO PLATO" : "EDITAR PLATO"}</p><h2>{dish.isNew ? "Sumalo a tu carta" : "Afiná cada detalle"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>
        <button className="dish-image-picker" type="button" onClick={() => imageInputRef.current?.click()}>
          {draft.image ? <img src={draft.image} alt="" /> : draft.videoFile || draft.video ? <span className="dish-media-empty"><VideoCamera size={28} /> {draft.videoFile ? draft.videoName : draft.video?.fileName}</span> : <span className="dish-media-empty"><ImageSquare size={28} /> Agregá una foto o video</span>}
          <span className="dish-media-action">{draft.image || draft.videoFile || draft.video ? <><ImageSquare size={18} /> Cambiar contenido</> : <><ImageSquare size={18} /> Elegir contenido</>}</span>
        </button>
        {draft.image && draft.databaseId && <button className="text-button" type="button" onClick={async () => { try { await onRemoveImage(draft.databaseId); update("image", null); update("imageFile", undefined); } catch (error) { /* El padre muestra el error al usuario. */ } }}>Quitar foto</button>}
        <input ref={imageInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,video/mp4" onChange={(event) => selectMedia(event.target.files?.[0])} />
        <div className="dish-form">
          <label>Nombre del plato<input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Ej. Risotto de hongos" /></label>
          <label>Descripción<textarea value={draft.detail} onChange={(event) => update("detail", event.target.value)} rows="3" placeholder="Ingredientes y una descripción breve" /></label>
          <div className="dish-form-row">
            <label>Precio<input value={draft.price} onChange={(event) => update("price", event.target.value)} placeholder="$18.900" /></label>
            <label>Categoría<CartiaSelect value={draft.categoryId || ""} onChange={(next) => { const selected = categories.find((item) => item.id === next); update("categoryId", next); update("category", selected?.name || "Sin categoría"); }} ariaLabel="Categoría" options={categories.map((item) => ({ value: item.id, label: item.name }))} /><button className="category-create-button" type="button" onClick={onNewCategory}>+ Nueva categoría</button></label>
          </div>
          <label>Etiqueta<input value={draft.badge} onChange={(event) => update("badge", event.target.value)} placeholder="Ej. Favorito, Vegano" /></label>
          {(draft.videoFile || draft.video) && <button className="text-button" type="button" onClick={async () => { if (draft.video && draft.databaseId) { try { await onRemoveVideo(draft.databaseId); } catch { return; } } update("video", null); update("videoFile", undefined); update("videoName", undefined); }}>Quitar video</button>}
          <label className="dish-visible-toggle"><span><strong>Visible en la carta</strong><small>Podés ocultarlo temporalmente si se agota.</small></span><input type="checkbox" checked={draft.available} onChange={(event) => update("available", event.target.checked)} /><i /></label>
        </div>
        <footer>
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="button" onClick={() => onSave(draft)}><Check size={17} /> Guardar plato</button>
        </footer>
      </aside>
    </div>
  );
}

function CategoryModal({ mode, category, onClose, onSave, onArchive }) {
  const [name, setName] = useState(category?.name || "");
  const [saving, setSaving] = useState(false);
  const isArchive = mode === "archive";

  const submit = async (event) => {
    event.preventDefault();
    if (!isArchive && !name.trim()) return;
    setSaving(true);
    try {
      if (isArchive) await onArchive();
      else await onSave(name.trim());
    } catch {
      // El flujo superior conserva el modal abierto y ya muestra el mensaje de error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dish-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="dish-editor client-create-modal" role="dialog" aria-modal="true" aria-label={isArchive ? "Archivar categoría" : "Editar categoría"} onSubmit={submit}>
        <header><div><p className="eyebrow">CATEGORÍA</p><h2>{isArchive ? "Archivar categoría" : category ? "Renombrar categoría" : "Nueva categoría"}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>
        {isArchive ? <p className="heading-copy">Los platos de <strong>{category.name}</strong> pasarán a <strong>Sin categoría</strong>. Podés restaurar la categoría más adelante.</p> : <label className="field-label">Nombre<input autoFocus value={name} maxLength="80" onChange={(event) => setName(event.target.value)} placeholder="Ej. Bebidas" /></label>}
        <footer><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : isArchive ? "Archivar categoría" : "Guardar categoría"}</button></footer>
      </form>
    </div>
  );
}

function GuestMenu({ videoAssets, menuDishes, serviceOptions, visualTheme, restaurant, table, isPublic, hasTableContext, onExit, onToast, onServiceRequest, onSubmitOrder, onEvent }) {
  const [viewMode, setViewMode] = useState("reels");
  const [category, setCategory] = useState("Todos");
  const [muted, setMuted] = useState(true);
  const [activeReel, setActiveReel] = useState(0);
  const [selection, setSelection] = useState({});
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sentRequest, setSentRequest] = useState("");
  const [serviceSending, setServiceSending] = useState("");
  const [orderSending, setOrderSending] = useState(false);
  const reelFeedRef = useRef(null);
  const reelVideoRefs = useRef(new Map());
  const viewStartedAt = useRef(Date.now());
  const availableDishes = menuDishes.filter((dish) => dish.available);
  const categories = ["Todos", ...new Set(availableDishes.map((dish) => dish.category))];
  const filteredDishes = availableDishes.filter((dish) => {
    const matchesCategory = category === "Todos" || dish.category === category;
    const text = `${dish.name} ${dish.detail}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase().trim());
  });
  const selected = Object.values(selection).reduce((total, quantity) => total + quantity, 0);
  const selectedDishes = availableDishes.filter((dish) => selection[dish.id]);
  const total = selectedDishes.reduce((sum, dish) => sum + Number(dish.price.replace(/\D/g, "")) * selection[dish.id], 0);
  const canUseTableActions = !isPublic || hasTableContext;

  const dishVideo = (dish) => {
    const published = videoAssets?.[dish.id];
    if (published?.published && published?.url) return published.url;
    return dish.video?.published && dish.video?.url ? dish.video.url : null;
  };

  useEffect(() => {
    if (viewMode !== "reels") {
      reelVideoRefs.current.forEach((video) => video?.pause());
      return;
    }
    reelVideoRefs.current.forEach((video, index) => {
      if (!video) return;
      video.muted = muted;
      if (index === activeReel) video.play().catch(() => null);
      else video.pause();
    });
  }, [activeReel, muted, viewMode]);

  useEffect(() => {
    if (viewMode !== "reels" || !reelFeedRef.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector("video");
        if (!video) return;
        video.muted = muted;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) video.play().catch(() => null);
        else video.pause();
      });
    }, { root: reelFeedRef.current, threshold: [0.2, 0.65, 0.9] });
    reelFeedRef.current.querySelectorAll(".dish-reel").forEach((reel) => observer.observe(reel));
    return () => observer.disconnect();
  }, [muted, viewMode, availableDishes.length]);

  const addDish = (dish) => {
    if (!canUseTableActions) {
      onToast("Escaneá el QR de tu mesa para realizar un pedido");
      return;
    }
    setSelection((current) => ({ ...current, [dish.id]: (current[dish.id] || 0) + 1 }));
    onEvent?.({ type: "add_dish", dishId: dish.id });
    onToast(`${dish.name} agregado a tu selección`);
  };

  const changeQuantity = (id, change) => {
    setSelection((current) => {
      const next = Math.max(0, (current[id] || 0) + change);
      const updated = { ...current, [id]: next };
      if (!next) delete updated[id];
      return updated;
    });
  };

  const openReel = (dish) => {
    onEvent?.({ type: "dish_click", dishId: dish.id, metadata: { source: "list" } });
    const index = Math.max(0, availableDishes.findIndex((item) => item.id === dish.id));
    setActiveReel(index);
    setViewMode("reels");
    window.setTimeout(() => {
      const feed = reelFeedRef.current;
      if (feed) feed.scrollTo({ top: index * feed.clientHeight, behavior: "instant" });
      const video = reelVideoRefs.current.get(index);
      if (video) {
        video.muted = muted;
        video.play().catch(() => null);
      }
    }, 0);
  };

  const handleReelScroll = (event) => {
    const feed = event.currentTarget;
    const next = Math.round(feed.scrollTop / Math.max(feed.clientHeight, 1));
    if (next !== activeReel && next >= 0 && next < availableDishes.length) setActiveReel(next);
  };

  useEffect(() => {
    if (viewMode !== "reels") return undefined;
    const dish = availableDishes[activeReel];
    viewStartedAt.current = Date.now();
    return () => {
      if (dish) onEvent?.({ type: "dish_view", dishId: dish.id, durationMs: Date.now() - viewStartedAt.current });
    };
  }, [activeReel, viewMode]);

  const sendServiceRequest = async (type) => {
    if (serviceSending) return;
    setServiceSending(type);
    try {
      await onServiceRequest(type);
      setSentRequest(type);
      onToast(type === "waiter" ? "El mozo recibió tu llamado" : "La cuenta fue solicitada");
    } catch (error) {
      onToast(error.message || "No se pudo enviar la solicitud");
    } finally {
      setServiceSending("");
    }
  };

  const submitOrder = async () => {
    if (!selected || orderSending) return;
    setOrderSending(true);
    try {
      await onSubmitOrder(selectedDishes.map((dish) => ({ dishId: dish.id, quantity: selection[dish.id] })));
      setSelection({});
      setSelectionOpen(false);
      onToast(`Pedido enviado a ${table?.label || "la cocina"}`);
    } catch (error) {
      onToast(error.message || "No se pudo enviar el pedido");
    } finally {
      setOrderSending(false);
    }
  };

  return (
    <div
      className={`guest-page guest-${viewMode} ${isPublic ? "guest-public" : ""}`}
      style={{
        "--guest-primary": visualTheme.primary,
        "--guest-accent": visualTheme.accent,
        "--guest-paper": visualTheme.paper,
        "--serif": visualTheme.font === "Moderna limpia" ? '"DM Sans", Arial, sans-serif' : visualTheme.font === "Clásica cálida" ? 'Georgia, serif' : '"Cormorant Garamond", Georgia, serif',
      }}
    >
      {!isPublic && <div className="guest-preview-bar">
        <button type="button" onClick={onExit}><ArrowLeft size={17} /> Volver al panel</button>
        <span><Eye size={15} /> Vista previa del cliente</span>
      </div>}

      <main className="guest-menu-app">
        <header className="guest-header">
          <div className="guest-brand">
            {restaurant?.logo ? <img className="guest-brand-logo" src={restaurant.logo} alt="" /> : <span className="menu-monogram">{initials(restaurant?.name, "CI")}</span>}
            <span><strong>{restaurant?.name || "Carta digital"}</strong><small>{table?.label || restaurant?.tagline || "Menú del restaurante"}</small></span>
          </div>
          <button type="button" aria-label="Buscar platos" onClick={() => { setViewMode("list"); setSearchOpen(true); }}><MagnifyingGlass size={20} /></button>
        </header>

        <nav className="guest-view-switch" aria-label="Formato de la carta">
          <button className={viewMode === "reels" ? "active" : ""} type="button" onClick={() => setViewMode("reels")}>
            <Play size={14} weight="fill" /> Reels
          </button>
          <button className={viewMode === "list" ? "active" : ""} type="button" onClick={() => setViewMode("list")}>
            <ForkKnife size={15} /> Lista
          </button>
          <span>{viewMode === "reels" ? `${activeReel + 1} / ${availableDishes.length}` : `${filteredDishes.length} platos`}</span>
        </nav>

        {viewMode === "reels" ? (
          <section className="reel-feed" ref={reelFeedRef} onScroll={handleReelScroll} aria-label="Videos de los platos">
            {availableDishes.map((dish, index) => (
              <article className="dish-reel" key={dish.id} aria-label={`${dish.name}, ${dish.price}`}>
                {dishVideo(dish) ? <video
                  ref={(node) => {
                    if (node) reelVideoRefs.current.set(index, node);
                    else reelVideoRefs.current.delete(index);
                  }}
                  src={dishVideo(dish)}
                  poster={dish.image}
                  autoPlay={index === 0}
                  muted={muted}
                  loop
                  playsInline
                  preload={index < 2 ? "auto" : "metadata"}
                  onCanPlay={(event) => {
                    if (viewMode === "reels" && index === activeReel) event.currentTarget.play().catch(() => null);
                  }}
                  aria-label={`Video en loop de ${dish.name}`}
                /> : <div className="dish-reel-image" style={{ backgroundImage: dish.image ? `url(${dish.image})` : undefined }} />}
                <div className="dish-reel-shade" />
                {dishVideo(dish) && <div className="dish-reel-top">
                  <span><VideoCamera size={13} weight="fill" /> VIDEO DEL PLATO</span>
                  <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Activar sonido" : "Silenciar videos"}>
                    {muted ? <SpeakerSlash size={18} weight="fill" /> : <SpeakerHigh size={18} weight="fill" />}
                  </button>
                </div>}
                {canUseTableActions && <div className="dish-reel-actions">
                  <button type="button" onClick={() => addDish(dish)} aria-label={`Agregar ${dish.name}`}>
                    <span><Plus size={22} weight="bold" /></span>
                    Agregar
                  </button>
                  {selection[dish.id] > 0 && <strong>{selection[dish.id]} elegido{selection[dish.id] > 1 ? "s" : ""}</strong>}
                </div>}
                <div className="dish-reel-copy">
                  <div className="dish-reel-meta"><span>{dish.category}</span>{dish.badge && <span>{dish.badge}</span>}</div>
                  <h1>{dish.name}</h1>
                  <p>{dish.detail}</p>
                  <div><strong>{dish.price}</strong>{dishVideo(dish) && <span><Play size={10} weight="fill" /> Se repite en loop</span>}</div>
                </div>
                {index < availableDishes.length - 1 && <span className="reel-next-cue">Deslizá para ver el siguiente</span>}
              </article>
            ))}
          </section>
        ) : (
          <div className="guest-list-view">
            {searchOpen && (
              <label className="guest-search-field">
                <MagnifyingGlass size={18} />
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar un plato o ingrediente" />
                <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="Cerrar búsqueda"><X size={17} /></button>
              </label>
            )}
            <section className="guest-welcome">
              <p className="eyebrow">CARTA COMPLETA</p>
              <h1>Elegí con los ojos.</h1>
              <p>Tocá cualquier plato para verlo en video.</p>
            </section>
            <nav className="guest-categories" aria-label="Categorías de la carta">
              {categories.map((item) => (
                <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </nav>
            <section className="guest-dish-section">
              <div className="guest-section-heading">
                <div><p className="eyebrow">TODOS LOS PLATOS</p><h2>Encontrá tu próximo favorito</h2></div>
                <span>{filteredDishes.length} platos</span>
              </div>
              <div className="guest-dish-list">
                {filteredDishes.map((dish) => (
                  <article key={dish.id} className="guest-dish-list-card" role="button" tabIndex="0" onClick={() => openReel(dish)} onKeyDown={(event) => event.key === "Enter" && openReel(dish)}>
                    <div className="guest-list-media">
                      <img src={dish.image} alt={dish.name} />
                      <span><Play size={14} weight="fill" /> Ver video</span>
                    </div>
                    <div>
                      <span>{dish.badge || dish.category}</span>
                      <h3>{dish.name}</h3>
                      <p>{dish.detail}</p>
                      <div>
                        <strong>{dish.price}</strong>
                        {canUseTableActions && <button type="button" onClick={(event) => { event.stopPropagation(); addDish(dish); }} aria-label={`Agregar ${dish.name}`}><Plus size={18} /></button>}
                      </div>
                    </div>
                  </article>
                ))}
                {!filteredDishes.length && <div className="guest-empty-search"><MagnifyingGlass size={26} /><strong>No encontramos ese plato</strong><p>Probá con otra categoría o ingrediente.</p></div>}
              </div>
            </section>
            <footer className="guest-footer"><span>{restaurant?.name || "Carta digital"}</span><small>Carta impulsada por CartIA</small></footer>
          </div>
        )}
      </main>

      {isPublic && !hasTableContext && <aside className="guest-readonly-notice"><QrCode size={18} /><span>Escaneá el QR de tu mesa para pedir, llamar al mozo o solicitar la cuenta.</span></aside>}

      {canUseTableActions && <div className="guest-service-dock" style={{ "--service-count": Number(serviceOptions.waiter) + Number(serviceOptions.bill) + 1 }}>
        {serviceOptions.waiter && <button disabled={Boolean(serviceSending)} className={sentRequest === "waiter" ? "sent" : ""} type="button" onClick={() => sendServiceRequest("waiter")}>{serviceSending === "waiter" ? <SpinnerGap className="spin" size={19} /> : sentRequest === "waiter" ? <Check size={19} /> : <BellSimple size={19} />} {sentRequest === "waiter" ? "Enviado" : "Llamar"}</button>}
        {serviceOptions.bill && <button disabled={Boolean(serviceSending)} className={sentRequest === "bill" ? "sent" : ""} type="button" onClick={() => sendServiceRequest("bill")}>{serviceSending === "bill" ? <SpinnerGap className="spin" size={19} /> : sentRequest === "bill" ? <Check size={19} /> : <Receipt size={19} />} {sentRequest === "bill" ? "Pedida" : "La cuenta"}</button>}
        <button className={selected > 0 ? "has-items" : ""} type="button" onClick={() => selected ? setSelectionOpen(true) : onToast("Todavía no elegiste platos")}><span>{selected}</span>Mi selección</button>
      </div>}

      {selectionOpen && (
        <div className="selection-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectionOpen(false)}>
          <section className="selection-sheet" role="dialog" aria-modal="true" aria-label="Mi selección">
            <div className="selection-handle" />
            <header><div><p className="eyebrow">MI SELECCIÓN</p><h2>Lo que te gustó</h2></div><button type="button" onClick={() => setSelectionOpen(false)} aria-label="Cerrar"><X size={19} /></button></header>
            <div className="selection-items">
              {selectedDishes.map((dish) => (
                <article key={dish.id}>
                  <img src={dish.image} alt="" />
                  <div><strong>{dish.name}</strong><small>{dish.price}</small></div>
                  <div className="quantity-control"><button type="button" onClick={() => changeQuantity(dish.id, -1)}>−</button><span>{selection[dish.id]}</span><button type="button" onClick={() => changeQuantity(dish.id, 1)}>+</button></div>
                </article>
              ))}
            </div>
            <div className="selection-total"><span>Total estimado</span><strong>${total.toLocaleString("es-AR")}</strong></div>
            <button className="selection-confirm" type="button" disabled={orderSending} onClick={submitOrder}>{orderSending ? <SpinnerGap className="spin" size={18} /> : <Check size={18} />} {isPublic ? "Enviar pedido" : "Probar envío del pedido"}</button>
            <p>{isPublic ? `El pedido llegará identificado como ${table?.label || "tu mesa"}.` : "En la carta escaneada, el pedido llegará al panel con la mesa exacta."}</p>
          </section>
        </div>
      )}
    </div>
  );
}

function AnaliticaScreen({ period, onPeriod, analytics }) {
  const kpis = analytics?.kpis || { scans: 0, views: 0, clicks: 0, adds: 0, orders: 0 };
  return (
    <main className="screen secondary-screen">
      <section className="screen-heading">
        <div>
          <p className="eyebrow">ANALÍTICA ACCIONABLE</p>
          <h1>Entendé qué hace atractiva tu carta</h1>
          <p className="heading-copy">No son visitas sueltas: son señales para decidir mejor.</p>
        </div>
        <PeriodSelect value={period} onChange={onPeriod} />
      </section>
      <section className="analytics-layout">
        {[["ESCANEOS", kpis.scans, QrCode], ["VISTAS DE PLATO", kpis.views, Eye], ["AGREGADOS", kpis.adds, Plus], ["PEDIDOS", kpis.orders, Receipt]].map(([label, value, Icon]) => <article className="chart-card" key={label}><small>{label}</small><h2>{value}</h2><p>Actividad real del período seleccionado.</p><span className="large-icon"><Icon size={28} /></span></article>)}
        {!kpis.scans && !kpis.views && !kpis.orders && <article className="chart-card span-two"><div className="empty-state"><ChartLineUp size={30} /><strong>Aún no hay analítica</strong><p>Los datos aparecerán cuando los clientes escaneen un QR e interactúen con la carta.</p></div></article>}
      </section>
    </main>
  );
}

function TableQrModal({ table, onClose, onToast, onArchive }) {
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    QRCode.toDataURL(table.menuUrl, {
      width: 900,
      margin: 3,
      color: { dark: "#173d31", light: "#fffdf8" },
      errorCorrectionLevel: "H",
    }).then(setQrData).catch(() => onToast("No se pudo generar el QR"));
  }, [table.menuUrl]);

  const download = () => {
    if (!qrData) return;
    const link = document.createElement("a");
    link.download = `cartia-${table.label.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = qrData;
    link.click();
    onToast(`QR de ${table.label} descargado`);
  };

  return (
    <div className="qr-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="qr-modal" role="dialog" aria-modal="true" aria-label={`Código QR de ${table.label}`}>
        <header><div><p className="eyebrow">QR ÚNICO DE MESA</p><h2>{table.label}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></header>
        <div className="qr-print-card">
          <span className="qr-print-brand">Cart<span>IA</span></span>
          {qrData ? <img src={qrData} alt={`Código QR de ${table.label}`} /> : <SpinnerGap className="spin" size={38} />}
          <strong>Escaneá para ver la carta</strong>
          <p>{table.label} · pedido y llamados identificados</p>
        </div>
        <div className="qr-security-note"><QrCode size={20} /><p><strong>Enlace privado y único</strong><span>No revela el número de mesa y puede desactivarse desde este panel.</span></p></div>
        <button className="primary-button full" type="button" disabled={!qrData} onClick={download}><DownloadSimple size={18} /> Descargar QR en alta calidad</button>
        <button className="text-button" type="button" onClick={async () => { if (!window.confirm(`¿Desactivar ${table.label}? Su QR dejará de funcionar.`)) return; await onArchive(table); onClose(); }}>Desactivar mesa</button>
      </section>
    </div>
  );
}

function MesasScreen({ onToast, tables, requests, orders, onAddTable, onArchiveTable, onResolveRequest, onUpdateOrder }) {
  const [newTable, setNewTable] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  const addTable = async (event) => {
    event.preventDefault();
    const label = newTable.trim() || `Mesa ${tables.length + 1}`;
    setCreating(true);
    try {
      await onAddTable(label);
      setNewTable("");
      onToast(`${label} creada con su QR único`);
    } catch (error) {
      onToast(error.message || "No se pudo crear la mesa");
    } finally {
      setCreating(false);
    }
  };

  const resolve = async (item) => {
    try {
      await onResolveRequest(item);
      onToast(`${item.table}: ${item.kind === "order" ? "pedido aceptado" : "solicitud resuelta"}`);
    } catch (error) {
      onToast(error.message || "No se pudo resolver la solicitud");
    }
  };
  const changeOrder = async (order, status) => {
    if (status === "CANCELLED" && !window.confirm(`¿Cancelar el pedido de ${order.table}?`)) return;
    try { await onUpdateOrder(order, status); onToast(status === "CANCELLED" ? "Pedido cancelado" : `Pedido de ${order.table} actualizado`); } catch (error) { onToast(error.message || "No se pudo actualizar el pedido"); }
  };
  const columns = [
    { status: "NEW", label: "Nuevos", action: "PREPARING", actionLabel: "Preparar" },
    { status: "PREPARING", label: "En preparación", action: "READY", actionLabel: "Marcar listo" },
    { status: "READY", label: "Listos", action: "DELIVERED", actionLabel: "Entregar" },
    { status: "DELIVERED", label: "Entregados", action: null, actionLabel: "" },
  ];
  const visibleStatus = (status) => status === "ACCEPTED" ? "PREPARING" : status;
  return (
    <main className="screen secondary-screen">
      <section className="screen-heading">
        <div><p className="eyebrow">SALA EN VIVO</p><h1>Cada pedido, en la mesa correcta</h1><p className="heading-copy">QR únicos, pedidos y llamados identificados en tiempo real.</p></div>
        <span className="live-pill"><span /> Servicio activo</span>
      </section>
      <form className="add-table-bar" onSubmit={addTable}>
        <div><span><QrCode size={22} /></span><p><strong>Agregar una mesa</strong><small>Se generará un código QR único listo para descargar.</small></p></div>
        <label><span>Nombre o número</span><input value={newTable} onChange={(event) => setNewTable(event.target.value)} placeholder={`Mesa ${tables.length + 1}`} maxLength="60" /></label>
        <button className="primary-button" type="submit" disabled={creating}>{creating ? <SpinnerGap className="spin" size={17} /> : <Plus size={17} />} Crear mesa</button>
      </form>
      <section className="table-board">
        <div className="requests-list">
          <div className="section-title-row"><h2>Solicitudes pendientes</h2><span>{requests.length}</span></div>
          {requests.map((item) => {
            const Icon = item.requestType === "bill" ? Receipt : BellSimple;
            const accent = item.requestType === "bill" ? "wine" : "saffron";
            return <article className="request-card" key={`${item.kind}-${item.id}`}>
              <span className={`request-card-icon ${accent}`}><Icon size={21} weight="fill" /></span>
              <div><strong>{item.table}</strong><p>{item.type}</p>{item.summary && <span className="request-summary">{item.summary}</span>}<small>{item.total ? `${item.total} · ` : ""}{item.time}</small></div>
              <button type="button" onClick={() => resolve(item)}><CheckCircle size={18} /> Resolver</button>
            </article>
          })}
          {!requests.length && <div className="empty-state"><CheckCircle size={30} /><strong>Todo al día</strong><p>No hay solicitudes pendientes.</p></div>}
        </div>
        <div className="room-map">
          <div className="section-title-row"><h2>Mesas y códigos QR</h2><span>{tables.length} mesas</span></div>
          <div className="tables-grid">
            {tables.filter((table) => table.active !== false).map((table) => {
              const pending = requests.filter((item) => item.table === table.label);
              return <button type="button" className={pending.length ? "urgent" : ""} key={table.id} onClick={() => setSelectedTable(table)}>
                <span>{table.label.replace(/^Mesa\s*/i, "")}</span>
                <small>{pending.length ? `${pending.length} pendiente${pending.length > 1 ? "s" : ""}` : "QR listo"}</small>
                <i><QrCode size={14} /> Ver QR</i>
              </button>;
            })}
          </div>
          {tables.some((table) => table.active === false) && <div className="archived-tables"><strong>Mesas desactivadas</strong>{tables.filter((table) => table.active === false).map((table) => <button type="button" className="catalog-edit" key={table.id} onClick={async () => { try { await onArchiveTable(table, false); onToast(`${table.label} volvió a estar activa`); } catch (error) { onToast(error.message || "No se pudo restaurar la mesa"); } }}>Restaurar {table.label}</button>)}</div>}
        </div>
      </section>
      <section className="catalog-manager order-board">
        <div className="section-title-row"><div><p className="eyebrow">PEDIDOS</p><h2>Cocina y salón</h2></div><span>{orders.length} activos</span></div>
        <div className="order-columns">{columns.map((column) => <section className="order-column" key={column.status}><h3>{column.label}<span>{orders.filter((order) => visibleStatus(order.status) === column.status).length}</span></h3>{orders.filter((order) => visibleStatus(order.status) === column.status).map((order) => <article className="request-card" key={order.id}><div><strong>{order.table}</strong><p>{order.summary}</p><small>{order.total}{order.notes ? ` · ${order.notes}` : ""}</small></div>{column.action && <button type="button" onClick={() => changeOrder(order, column.action)}>{column.actionLabel}</button>}{column.status !== "DELIVERED" && <button type="button" className="text-button" onClick={() => changeOrder(order, "CANCELLED")}>Cancelar</button>}</article>)}{!orders.some((order) => visibleStatus(order.status) === column.status) && <p className="heading-copy">Sin pedidos.</p>}</section>)}</div>
      </section>
      {selectedTable && <TableQrModal table={selectedTable} onClose={() => setSelectedTable(null)} onToast={onToast} onArchive={async (table) => { try { await onArchiveTable(table, true); onToast(`${table.label} fue desactivada`); } catch (error) { onToast(error.message || "No se pudo desactivar la mesa"); } }} />}
    </main>
  );
}

function StyleScreen({ onToast, serviceOptions, onServiceOptions, visualTheme, onVisualTheme, onOpenGuest, restaurant, menuDishes, onUploadLogo }) {
  const logoInputRef = useRef(null);
  const displayName = restaurant?.name || "Tu restaurante";
  const featuredDish = menuDishes.find((dish) => dish.available) || null;
  const palettes = [
    { name: "Oliva editorial", colors: ["#173d31", "#f0b44d", "#f6f0e5"] },
    { name: "Vino cálido", colors: ["#572536", "#d7926c", "#f8efe7"] },
    { name: "Costa serena", colors: ["#162b49", "#88b4c6", "#f5f2ea"] },
  ];
  const activePalette = Math.max(0, palettes.findIndex((palette) => palette.colors[0] === visualTheme.primary));
  const selectPalette = (palette) => {
    onVisualTheme({ primary: palette.colors[0], accent: palette.colors[1], paper: palette.colors[2], name: palette.name });
  };
  return (
    <main className="screen secondary-screen">
      <section className="screen-heading">
        <div><p className="eyebrow">IDENTIDAD VISUAL</p><h1>Que la carta se sienta tuya</h1><p className="heading-copy">Cambiá colores, tipografía y logo sin tocar código.</p></div>
        <div className="toolbar-actions">
          <button className="secondary-button" type="button" onClick={onOpenGuest}><DeviceMobile size={17} /> Ver en celular</button>
          <button className="primary-button" type="button" onClick={() => onToast("Cambios guardados y publicados")}><Check size={17} /> Confirmar cambios</button>
        </div>
      </section>
      <section className="style-layout">
        <div className="style-controls">
          <div className="control-card">
            <span className="control-number">01</span>
            <div><h2>Logo del restaurante</h2><p>PNG o SVG sobre fondo transparente.</p></div>
            <button type="button" onClick={() => logoInputRef.current?.click()}>{restaurant?.logo ? <img className="style-logo-thumb" src={restaurant.logo} alt="" /> : <ImageSquare size={18} />} {restaurant?.logo ? "Reemplazar logo" : "Cargar logo"}</button>
            <input ref={logoInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try { await onUploadLogo(file); onToast("Logo actualizado en la carta"); } catch (error) { onToast(error.message || "No se pudo cargar el logo"); }
            }} />
          </div>
          <div className="control-card palette-control">
            <span className="control-number">02</span>
            <div><h2>Paleta de colores</h2><p>Elegí una base y ajustala a tu identidad.</p></div>
            <div className="palette-list">
              {palettes.map((palette, index) => (
                <button className={activePalette === index ? "active" : ""} key={palette.name} type="button" onClick={() => selectPalette(palette)} aria-label={palette.name}>
                  {palette.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
                  {activePalette === index && <Check size={15} weight="bold" />}
                </button>
              ))}
            </div>
          </div>
          <div className="control-card">
            <span className="control-number">03</span>
            <div><h2>Tipografía</h2><p>Editorial para títulos, simple para leer rápido.</p></div>
            <CartiaSelect value={visualTheme.font || "Elegante editorial"} onChange={(font) => onVisualTheme((current) => ({ ...current, font }))} ariaLabel="Tipografía de la carta" options={["Elegante editorial", "Moderna limpia", "Clásica cálida"]} />
          </div>
          <div className="control-card">
            <span className="control-number">04</span>
            <div><h2>Acciones de mesa</h2><p>Activá solo lo que tu operación necesita.</p></div>
            <div className="toggle-stack">
              <label><span>Llamar al mozo</span><input type="checkbox" checked={serviceOptions.waiter} onChange={(event) => onServiceOptions((current) => ({ ...current, waiter: event.target.checked }))} /><i /></label>
              <label><span>Pedir la cuenta</span><input type="checkbox" checked={serviceOptions.bill} onChange={(event) => onServiceOptions((current) => ({ ...current, bill: event.target.checked }))} /><i /></label>
            </div>
          </div>
        </div>
        <div className="phone-preview" style={{ "--phone-primary": visualTheme.primary, "--phone-accent": visualTheme.accent, "--phone-paper": visualTheme.paper }}>
          <div className="phone-top" />
          {restaurant?.logo ? <img className="phone-logo" src={restaurant.logo} alt={displayName} /> : <span className="menu-monogram">{displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>}
          <small>{displayName.toUpperCase()}</small>
          <h2>Sabores para recordar</h2>
          {featuredDish?.image ? <img src={featuredDish.image} alt="" /> : <span className="dish-image-empty"><ImageSquare size={28} /> Sin foto</span>}
          <h3>{featuredDish?.name || "Todavía no hay platos"}</h3>
          <p>{featuredDish?.detail || "Creá un plato y cargá una imagen para ver la vista previa."}</p>
          <button type="button" onClick={onOpenGuest}>Ver plato</button>
          <div className="phone-actions-preview">
            {serviceOptions.waiter && <span><BellSimple size={13} /> Mozo</span>}
            {serviceOptions.bill && <span><Receipt size={13} /> Cuenta</span>}
          </div>
        </div>
      </section>
    </main>
  );
}

function ContentScreen({ onToast, onOpenGuest, publishedVideos, onPublishVideos, menuDishes, restaurant, onUploadVideo, onRemoveVideo }) {
  const fileInputRef = useRef(null);
  const uploadTimerRef = useRef(null);
  const firstVideo = publishedVideos[menuDishes[0]?.id] || null;
  const [draft, setDraft] = useState(firstVideo);
  const [progress, setProgress] = useState(firstVideo ? 100 : 0);
  const [targetDishId, setTargetDishId] = useState(firstVideo?.dishId || menuDishes[0]?.id || "");
  const [error, setError] = useState("");

  useEffect(() => () => window.clearInterval(uploadTimerRef.current), []);

  const handleFile = (file) => {
    if (!file) return;
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase();
    const accepted = extension === "mp4";
    if (!accepted) {
      setError("Para la beta de Hostinger usá MP4 con video H.264 y audio AAC.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("El archivo supera 50 MB. Comprimilo antes de subirlo.");
      return;
    }

    if (draft?.url?.startsWith("blob:") && draft.url !== publishedVideos[draft.dishId]?.url) URL.revokeObjectURL(draft.url);
    const url = URL.createObjectURL(file);
    const targetDish = menuDishes.find((dish) => dish.id === targetDishId) || menuDishes[0];
    setDraft({
      url,
      fileName: file.name,
      size: file.size,
      type: file.type || `video/${extension}`,
      dish: targetDish?.name || "",
      dishId: targetDish?.id || "",
      duration: null,
      width: null,
      height: null,
      published: false,
      file,
    });
    setProgress(0);
    window.clearInterval(uploadTimerRef.current);
  };

  const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const publish = async (openAfter = false) => {
    if (!draft || !draft.file) return;
    try {
      const dish = menuDishes.find((item) => item.id === draft.dishId);
      const published = await onUploadVideo(draft.file, dish, draft, setProgress);
      setDraft(published);
      onPublishVideos((current) => ({ ...current, [published.dishId]: published }));
      onToast("Video publicado en la carta");
      if (openAfter) window.setTimeout(onOpenGuest, 180);
    } catch (uploadError) {
      setError(uploadError.message || "No se pudo publicar el video");
      setProgress(100);
    }
  };

  const removeDraft = async () => {
    if (draft?.dishId && !draft.file) {
      try { await onRemoveVideo(draft.dishId); } catch (error) { setError(error.message || "No se pudo eliminar el video"); return; }
    }
    if (draft?.url?.startsWith("blob:")) URL.revokeObjectURL(draft.url);
    const removedDishId = draft?.dishId;
    setDraft(null);
    setProgress(0);
    setError("");
    if (removedDishId) {
      onPublishVideos((current) => {
        const next = { ...current };
        delete next[removedDishId];
        return next;
      });
    }
    onToast("Video eliminado de la carta");
  };

  const manageVideo = (dish) => {
    const video = publishedVideos[dish.id];
    if (video) {
      setTargetDishId(dish.id);
      setDraft({ ...video, dish: dish.name, dishId: dish.id });
      setProgress(100);
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setTargetDishId(dish.id);
      setDraft(null);
      setProgress(0);
      window.setTimeout(() => fileInputRef.current?.click(), 0);
    }
  };

  return (
    <main className="screen secondary-screen video-admin-screen">
      <section className="screen-heading video-heading">
        <div><p className="eyebrow">CONTENIDO IA · PUBLICACIÓN</p><h1>El plato entra por los ojos</h1><p className="heading-copy">Cargá un video, revisalo como cliente y publicalo cuando esté perfecto.</p></div>
        <button className="secondary-button" type="button" onClick={onOpenGuest}><DeviceMobile size={17} /> Ver carta del cliente</button>
      </section>

      <section className="video-workspace">
        <div className="video-upload-column">
          <div className="video-step-heading"><span>01</span><div><h2>Subí el video</h2><p>Se guardará en R2 y quedará visible al instante.</p></div></div>
          {!draft ? (
            <button
              className="video-dropzone"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <span><CloudArrowUp size={30} weight="duotone" /></span>
              <strong>Arrastrá tu video acá</strong>
              <p>o elegilo desde tu computadora</p>
              <small>MP4 (H.264) · máximo 50 MB</small>
            </button>
          ) : (
            <div className="video-preview-card">
              <div className="video-preview-media">
                {draft.type === "video/quicktime" ? (
                  <div className="mov-preview">
                    <FileVideo size={34} />
                    <strong>Archivo MOV listo para procesar</strong>
                    <small>Se convertirá antes de publicarse.</small>
                  </div>
                ) : (
                  <video
                    src={draft.url}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(event) => {
                      const media = event.currentTarget;
                      setDraft((current) => current ? { ...current, duration: media.duration, width: media.videoWidth, height: media.videoHeight } : current);
                    }}
                  />
                )}
                {draft.published && <span className="published-overlay"><CheckCircle size={16} weight="fill" /> Publicado</span>}
              </div>
              <div className="video-file-row">
                <span><FileVideo size={20} /></span>
                <div><strong>{draft.fileName}</strong><small>{formatSize(draft.size)}{draft.duration ? ` · ${Math.round(draft.duration)} s` : ""}</small></div>
                <button className="replace-video-button" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Cambiar video"><UploadSimple size={18} /></button>
                <button type="button" onClick={removeDraft} aria-label="Eliminar video"><Trash size={18} /></button>
              </div>
              <div className="upload-progress">
                <span style={{ width: `${progress}%` }} />
              </div>
              <small className="upload-status">{progress < 100 ? `Preparando archivo · ${progress}%` : "Archivo listo para publicar"}</small>
            </div>
          )}
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".mp4,video/mp4"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {error && <div className="video-error"><WarningCircle size={18} /> {error}</div>}

          <div className="video-specs">
            <div><span className="spec-icon"><DeviceMobile size={20} /></span><p><strong>Vertical recomendado</strong>1080 × 1920 · relación 9:16</p></div>
            <div><span className="spec-icon"><Clock size={20} /></span><p><strong>Corto y apetitoso</strong>6 a 12 segundos · sin introducción</p></div>
            <div><span className="spec-icon"><FileVideo size={20} /></span><p><strong>Liviano para cargar</strong>Ideal entre 3 y 8 MB</p></div>
          </div>
        </div>

        <aside className="video-publish-panel">
          <div className="video-step-heading light"><span>02</span><div><h2>Prepará la publicación</h2><p>Así aparecerá en la carta.</p></div></div>
          <label className="video-field">Plato asociado
            <CartiaSelect value={draft?.dish || ""} onChange={(next) => { const dish = menuDishes.find((item) => item.name === next); if (!dish) return; setTargetDishId(dish.id); setDraft((current) => current ? { ...current, dish: dish.name, dishId: dish.id, published: false } : current); }} ariaLabel="Plato asociado" options={menuDishes.map((dish) => ({ value: dish.name, label: dish.name }))} disabled={!draft} />
          </label>
          <div className="video-mobile-mock">
            <div className="video-mobile-top">{restaurant?.logo ? <img className="guest-brand-logo" src={restaurant.logo} alt="" /> : <span className="menu-monogram">{initials(restaurant?.name, "CI")}</span>}<div><strong>{restaurant?.name || "Vista previa"}</strong><small>Vista del cliente</small></div></div>
            <div className="video-mobile-media">
              {draft && draft.type !== "video/quicktime" ? <video src={draft.url} muted autoPlay loop playsInline /> : <div className="dish-image-empty"><VideoCamera size={28} /> Elegí un video</div>}
              <span><Play size={14} weight="fill" /> Video del chef</span>
            </div>
            <h3>{draft?.dish || "Seleccioná un plato"}</h3>
            <p>La vista previa usará el video y los datos reales del plato seleccionado.</p>
          </div>
          <div className="publish-checks">
            <span className={draft ? "done" : ""}><Check size={14} /> Archivo seleccionado</span>
            <span className={progress === 100 ? "done" : ""}><Check size={14} /> Procesamiento completo</span>
            <span className={draft?.published ? "done" : ""}><Check size={14} /> Visible en la carta</span>
          </div>
          <button className="primary-button full" type="button" disabled={!draft || !draft.file} onClick={() => publish(false)}>
            <UploadSimple size={17} /> {progress > 0 && progress < 100 ? `Subiendo · ${progress}%` : draft?.published ? "Volver a publicar" : "Publicar video"}
          </button>
          <button className="video-preview-cta" type="button" disabled={!draft || !draft.file} onClick={() => publish(true)}>
            <DeviceMobile size={17} /> Publicar y ver como cliente
          </button>
          <p className="storage-note">El video se publica en R2 con caché prolongada. Recomendado: 720 × 1280, 6–12 s y 3–8 MB.</p>
        </aside>
      </section>

      <section className="video-library">
        <div className="section-title-row"><div><p className="eyebrow">BIBLIOTECA</p><h2>Un video para cada plato</h2></div><span>{Object.keys(publishedVideos).length} videos</span></div>
        <div className="video-library-grid">
          {menuDishes.map((dish) => (
            <article key={dish.id}>
              <img src={dish.image} alt="" />
              <div><strong>{dish.name}</strong><small>{publishedVideos[dish.id] ? "Video publicado · loop activo" : "Esperando video"}</small></div>
              <button type="button" onClick={() => manageVideo(dish)}><SlidersHorizontal size={17} /> Gestionar</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminScreen({ onToast, clients, onCreateRestaurant, onLoadUsers, onCreateUser }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ restaurantName: "", locationSlug: "", tagline: "", adminName: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [managedClient, setManagedClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [userDraft, setUserDraft] = useState({ name: "", email: "", password: "", organizationRole: "", locationRole: "STAFF" });
  const [userSaving, setUserSaving] = useState(false);
  const filtered = clients.filter((client) => client.name.toLowerCase().includes(query.toLowerCase()));

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await onCreateRestaurant(draft);
      setCreating(false);
      setDraft({ restaurantName: "", locationSlug: "", tagline: "", adminName: "", email: "", password: "" });
      onToast(created?.publicUrl ? `Restaurante creado: ${created.publicUrl}` : "Restaurante creado y subdominio listo para usar");
    } catch (error) {
      onToast(error.message || "No se pudo crear el restaurante");
    } finally {
      setSaving(false);
    }
  };
  const manageUsers = async (client) => {
    setManagedClient(client);
    try { const data = await onLoadUsers(client.organizationId); setUsers(data.users || []); } catch (error) { onToast(error.message || "No se pudieron cargar los usuarios"); }
  };
  const createUser = async (event) => {
    event.preventDefault(); setUserSaving(true);
    try {
      await onCreateUser(managedClient.organizationId, { ...userDraft, organizationRole: userDraft.organizationRole || undefined, locations: [{ locationId: managedClient.id, role: userDraft.locationRole }] });
      const data = await onLoadUsers(managedClient.organizationId); setUsers(data.users || []); setUserDraft({ name: "", email: "", password: "", organizationRole: "", locationRole: "STAFF" }); onToast("Usuario creado correctamente");
    } catch (error) { onToast(error.message || "No se pudo crear el usuario"); } finally { setUserSaving(false); }
  };
  return (
    <main className="screen secondary-screen">
      <section className="screen-heading">
        <div><p className="eyebrow">SUPERADMIN · CARTIA</p><h1>Restaurantes bajo control</h1><p className="heading-copy">Altas, accesos, contenido y soporte personalizado desde un solo lugar.</p></div>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo restaurante</button>
      </section>
      <section className="admin-stats">
        <article><Storefront size={22} /><div><strong>{clients.filter((client) => client.status === "active").length}</strong><small>Clientes activos</small></div></article>
        <article><QrCode size={22} /><div><strong>{clients.reduce((total, client) => total + Number(client.table_count || 0), 0)}</strong><small>Mesas con QR</small></div></article>
        <article><MagicWand size={22} /><div><strong>{clients.reduce((total, client) => total + Number(client.dish_count || 0), 0)}</strong><small>Platos gestionados</small></div></article>
      </section>
      <section className="client-table">
        <div className="client-table-toolbar"><h2>Clientes</h2><label><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar restaurante" /></label></div>
        {filtered.map((client) => (
          <article key={client.id}>
            <span className="client-avatar">{client.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
            <div><strong>{client.name}</strong><small>{client.publicUrl || `/${client.slug}`}</small></div>
            <span>{client.table_count} mesas · {client.dish_count} platos</span>
            <span className={`status-chip ${client.status === "active" ? "active" : "setup"}`}>{client.status === "active" ? "Activo" : "Pausado"}</span>
            {client.publicUrl && <button type="button" onClick={async () => {
              try {
                await navigator.clipboard.writeText(client.publicUrl);
                onToast("URL pública copiada");
              } catch {
                onToast(client.publicUrl);
              }
            }}>Copiar URL</button>}
            <button type="button" onClick={() => manageUsers(client)}>Usuarios</button>
          </article>
        ))}
      </section>
      {managedClient && <section className="client-table" aria-label="Usuarios de la empresa">
        <div className="client-table-toolbar"><div><p className="eyebrow">EQUIPO · {managedClient.organizationName}</p><h2>Usuarios y accesos</h2></div><button className="secondary-button" type="button" onClick={() => setManagedClient(null)}>Cerrar</button></div>
        {users.map((user) => <article key={user.id}><span className="client-avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><span>{user.organizationRole || user.locations?.[0]?.role || "Usuario de local"}</span><span className={`status-chip ${user.status === "ACTIVE" ? "active" : "setup"}`}>{user.status === "ACTIVE" ? "Activo" : "Inactivo"}</span></article>)}
<form className="dish-form" onSubmit={createUser}><h3>Crear usuario</h3><label>Nombre<input value={userDraft.name} onChange={(event) => setUserDraft((current) => ({ ...current, name: event.target.value }))} required /></label><label>Email<input type="email" value={userDraft.email} onChange={(event) => setUserDraft((current) => ({ ...current, email: event.target.value }))} required /></label><label>Contraseña<input type="password" minLength="10" value={userDraft.password} onChange={(event) => setUserDraft((current) => ({ ...current, password: event.target.value }))} required /></label><label>Rol<CartiaSelect value={userDraft.organizationRole} onChange={(next) => setUserDraft((current) => ({ ...current, organizationRole: next }))} ariaLabel="Rol" options={[{ value: "", label: "Usuario de local" }, { value: "ADMIN", label: "Organization Admin" }, { value: "ANALYST", label: "Analyst" }]} /></label><button className="primary-button" type="submit" disabled={userSaving}>{userSaving ? "Creando…" : "Crear usuario"}</button></form>
      </section>}
      {creating && <div className="dish-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreating(false)}>
        <aside className="dish-editor client-create-modal" role="dialog" aria-modal="true" aria-label="Nuevo restaurante">
          <header><div><p className="eyebrow">ALTA MANUAL · CARTIA</p><h2>Nuevo restaurante</h2></div><button type="button" onClick={() => setCreating(false)} aria-label="Cerrar"><X size={20} /></button></header>
          <form className="dish-form" onSubmit={create}>
            <label>Nombre del restaurante<input value={draft.restaurantName} onChange={(event) => setDraft((current) => ({ ...current, restaurantName: event.target.value, locationSlug: current.locationSlug || slugifyClient(event.target.value) }))} placeholder="Ej. Casa Nona" required /></label>
            <label>Subdominio<input value={draft.locationSlug} onChange={(event) => setDraft((current) => ({ ...current, locationSlug: slugifyClient(event.target.value) }))} placeholder="casa-nona" required /><small>{draft.locationSlug ? `https://${draft.locationSlug}.cartia.ar` : "Se genera desde el nombre del restaurante."}</small></label>
            <label>Descripción breve<input value={draft.tagline} onChange={(event) => setDraft((current) => ({ ...current, tagline: event.target.value }))} placeholder="Cocina italiana contemporánea" /></label>
            <label>Nombre del responsable<input value={draft.adminName} onChange={(event) => setDraft((current) => ({ ...current, adminName: event.target.value }))} placeholder="Nombre y apellido" required /></label>
            <label>Email de acceso<input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="admin@restaurante.com" required /></label>
            <label>Contraseña inicial<input type="password" minLength="10" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Mínimo 10 caracteres" required /></label>
            <footer><button className="secondary-button" type="button" onClick={() => setCreating(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? <SpinnerGap className="spin" size={17} /> : <Plus size={17} />} Crear acceso</button></footer>
          </form>
        </aside>
      </div>}
    </main>
  );
}

function PlatformAdminScreen({ organizations, onRefresh, onToast, onCreateOrganization, onUpdateOrganization, onAddLocation, onUpdateLocation, onLoadUsers, onCreateUser, onUpdateUser, onSelectLocation }) {
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(null);
  const [newLocation, setNewLocation] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [locationDraft, setLocationDraft] = useState({ name: "", slug: "", address: "" });
  const [userDraft, setUserDraft] = useState({ name: "", email: "", password: "", organizationRole: "", locationId: "", locationRole: "STAFF" });
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", locationSlug: "", ownerName: "", ownerEmail: "", ownerPassword: "" });
  const selected = organizations.find((item) => item.id === selectedId) || null;
  const loadUsers = async (organizationId = selected?.id) => { if (!organizationId) return; try { const data = await onLoadUsers(organizationId); setUsers(data.users || []); } catch (error) { onToast(error.message); } };
  const choose = (id) => { setSelectedId(id); setEditing(null); setUsers([]); if (id) loadUsers(id); };
  const saveLocation = async (event) => { event.preventDefault(); setBusy(true); try { if (editing) await onUpdateLocation(editing.id, { name: locationDraft.name, address: locationDraft.address, status: editing.status }); else await onAddLocation(selected.id, locationDraft); setLocationDraft({ name: "", slug: "", address: "" }); setEditing(null); setNewLocation(false); await onRefresh(); onToast(editing ? "Local actualizado" : "Local creado"); } catch (error) { onToast(error.message); } finally { setBusy(false); } };
  const saveUser = async (event) => { event.preventDefault(); setBusy(true); try { await onCreateUser(selected.id, { ...userDraft, organizationRole: userDraft.organizationRole || undefined, locations: userDraft.locationId ? [{ locationId: userDraft.locationId, role: userDraft.locationRole }] : [] }); setUserDraft({ name: "", email: "", password: "", organizationRole: "", locationId: "", locationRole: "STAFF" }); await loadUsers(); onToast("Usuario creado"); } catch (error) { onToast(error.message); } finally { setBusy(false); } };
  const saveOrganization = async (event) => { event.preventDefault(); setBusy(true); try { await onCreateOrganization(createDraft); setCreateOpen(false); setCreateDraft({ name: "", locationSlug: "", ownerName: "", ownerEmail: "", ownerPassword: "" }); await onRefresh(); onToast("Empresa creada"); } catch (error) { onToast(error.message); } finally { setBusy(false); } };
  const pause = async (location) => { try { await onUpdateLocation(location.id, { status: location.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }); await onRefresh(); onToast(location.status === "ACTIVE" ? "Local pausado" : "Local reactivado"); } catch (error) { onToast(error.message); } };
  return <><main className="screen secondary-screen">
    <section className="screen-heading"><div><p className="eyebrow">SUPERADMIN · CARTIA</p><h1>Empresas y accesos</h1><p className="heading-copy">Seleccioná una empresa antes de administrar sus locales o usuarios.</p></div><button className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nueva empresa</button></section>
    <section className="admin-stats"><article><Storefront size={22} /><div><strong>{organizations.length}</strong><small>Empresas</small></div></article><article><QrCode size={22} /><div><strong>{organizations.reduce((sum, item) => sum + Number(item.tableCount ?? 0), 0) || "—"}</strong><small>Mesas con QR</small></div></article><article><MagicWand size={22} /><div><strong>{organizations.reduce((sum, item) => sum + Number(item.dishCount ?? 0), 0) || "—"}</strong><small>Platos activos</small></div></article></section>
    <section className="client-table"><div className="client-table-toolbar"><div><p className="eyebrow">CONTEXTO DE TRABAJO</p><h2>Elegir empresa</h2></div><CartiaSelect value={selectedId} onChange={choose} ariaLabel="Empresa" options={[{ value: "", label: "Seleccioná una empresa" }, ...organizations.map((item) => ({ value: item.id, label: item.name }))]} className="cartia-select-filter" /></div>
      {organizations.map((item) => <article key={item.id} className={selectedId === item.id ? "selected-admin-row" : ""}><span className="client-avatar">{initials(item.name, "CA")}</span><div><strong>{item.name}</strong><small>{item.locations?.length || 0} locales · {item.slug}.cartia.ar</small></div><span>{item.tableCount ?? "—"} mesas · {item.dishCount ?? "—"} platos</span><span className={`status-chip ${item.status === "ACTIVE" ? "active" : "setup"}`}>{item.status === "ACTIVE" ? "Activa" : "Pausada"}</span><button type="button" onClick={() => choose(item.id)}>Ver empresa</button></article>)}
      {!organizations.length && <div className="empty-state"><Storefront size={28} /><strong>Sin empresas todavía</strong><p>Creá la primera empresa para comenzar.</p></div>}
    </section>
    {selected && <section className="client-table"><div className="client-table-toolbar"><div><p className="eyebrow">EMPRESA · {selected.name}</p><h2>Locales</h2></div><div><button className="secondary-button" type="button" onClick={async () => { const name = window.prompt("Nombre de la empresa", selected.name); if (name?.trim()) { await onUpdateOrganization(selected.id, { name: name.trim() }); await onRefresh(); } }}>Editar empresa</button><button className="primary-button" type="button" onClick={() => { setEditing(null); setLocationDraft({ name: "", slug: "", address: "" }); }}>+ Nuevo local</button></div></div>
      {selected.locations.map((location) => <article key={location.id}><span className="client-avatar">{initials(location.name, "LO")}</span><div><strong>{location.name}</strong><small>{location.publicUrl}</small></div><span>{location.tableCount ?? "—"} mesas · {location.dishCount ?? "—"} platos</span><span className={`status-chip ${location.status === "ACTIVE" ? "active" : "setup"}`}>{location.status === "ACTIVE" ? "Activo" : "Pausado"}</span><button type="button" onClick={() => onSelectLocation(location.id)}>Operar</button><button type="button" onClick={() => { setEditing(location); setLocationDraft({ name: location.name, slug: location.slug, address: location.address || "" }); }}>Editar</button><button type="button" onClick={() => pause(location)}>{location.status === "ACTIVE" ? "Pausar" : "Reactivar"}</button></article>)}
      {(editing || locationDraft.name || locationDraft.slug) && <form className="dish-form" onSubmit={saveLocation}><h3>{editing ? "Editar local" : "Nuevo local"}</h3><label>Nombre<input value={locationDraft.name} onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })} required /></label>{!editing && <label>Subdominio<input value={locationDraft.slug} onChange={(event) => setLocationDraft({ ...locationDraft, slug: slugifyClient(event.target.value) })} required /><small>{locationDraft.slug ? `https://${locationDraft.slug}.cartia.ar` : "Se genera desde el nombre."}</small></label>}<label>Dirección<input value={locationDraft.address} onChange={(event) => setLocationDraft({ ...locationDraft, address: event.target.value })} /></label><button className="primary-button" disabled={busy}>{busy ? "Guardando…" : "Guardar local"}</button></form>}
    </section>}
    {selected && <section className="client-table"><div className="client-table-toolbar"><div><p className="eyebrow">ACCESOS · {selected.name}</p><h2>Usuarios</h2></div></div>{users.map((user) => <article key={user.id}><span className="client-avatar">{initials(user.name, "U")}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><span>{user.organizationRole || user.locations?.map((item) => item.name).join(", ") || "Usuario de local"}</span><span className={`status-chip ${user.status === "ACTIVE" ? "active" : "setup"}`}>{user.status === "ACTIVE" ? "Activo" : "Inactivo"}</span><button type="button" onClick={async () => { await onUpdateUser(user.id, { organizationId: selected.id, status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }); await loadUsers(); }}> {user.status === "ACTIVE" ? "Desactivar" : "Activar"}</button></article>)}<form className="dish-form" onSubmit={saveUser}><h3>Nuevo usuario</h3><label>Nombre<input value={userDraft.name} onChange={(event) => setUserDraft({ ...userDraft, name: event.target.value })} required /></label><label>Email<input type="email" value={userDraft.email} onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} required /></label><label>Contraseña<input type="password" minLength="10" value={userDraft.password} onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })} required /></label><label>Rol<CartiaSelect value={userDraft.organizationRole} onChange={(value) => setUserDraft({ ...userDraft, organizationRole: value })} ariaLabel="Rol de usuario" options={[{ value: "", label: "Usuario de local" }, { value: "ADMIN", label: "Organization Admin" }, { value: "ANALYST", label: "Analyst" }]} /></label><label>Local<CartiaSelect value={userDraft.locationId} onChange={(value) => setUserDraft({ ...userDraft, locationId: value })} ariaLabel="Local asignado" options={[{ value: "", label: "Sin local asignado" }, ...selected.locations.map((item) => ({ value: item.id, label: item.name }))]} /></label><button className="primary-button" disabled={busy}>{busy ? "Guardando…" : "Crear usuario"}</button></form></section>}
  </main>{createOpen && <div className="dish-editor-backdrop"><form className="dish-editor dish-form" onSubmit={saveOrganization}><header><h2>Nueva empresa</h2><button type="button" onClick={() => setCreateOpen(false)}>Cerrar</button></header><label>Empresa<input value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })} required /></label><label>Subdominio<input value={createDraft.locationSlug} onChange={(event) => setCreateDraft({ ...createDraft, locationSlug: slugifyClient(event.target.value) })} required /></label><label>Responsable<input value={createDraft.ownerName} onChange={(event) => setCreateDraft({ ...createDraft, ownerName: event.target.value })} required /></label><label>Email<input type="email" value={createDraft.ownerEmail} onChange={(event) => setCreateDraft({ ...createDraft, ownerEmail: event.target.value })} required /></label><label>Contraseña inicial<input type="password" minLength="10" value={createDraft.ownerPassword} onChange={(event) => setCreateDraft({ ...createDraft, ownerPassword: event.target.value })} required /></label><button className="primary-button" disabled={busy}>Crear empresa y Owner</button></form></div>}</>;
}

function ImproveDrawer({ onClose, onSave }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="improve-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
        <div><p className="eyebrow">MEJORA GUIADA</p><h2 id="improve-title">Mejorá un plato con datos reales</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="suggestion-box"><MagicWand size={20} weight="fill" /><p><strong>Qué detectamos</strong>Cuando haya suficiente actividad, esta pantalla te ayudará a priorizar mejoras basadas en datos reales.</p></div>
        <div className="drawer-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="button" onClick={onSave}><Check size={17} /> Guardar mejora</button>
        </div>
      </aside>
    </div>
  );
}

function RequestsDrawer({ onClose, onRoom, requests }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer request-drawer" role="dialog" aria-modal="true" aria-labelledby="requests-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><p className="eyebrow">SALA EN VIVO</p><h2 id="requests-title">{requests.length} operación{requests.length === 1 ? "" : "es"} pendiente{requests.length === 1 ? "" : "s"}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        {requests.slice(0, 4).map((item) => {
          const Icon = item.kind === "order" ? ForkKnife : item.requestType === "bill" ? Receipt : BellSimple;
          const tone = item.kind === "order" ? "request-icon-order" : item.requestType === "bill" ? "request-icon-bill" : "request-icon-waiter";
          return <article className="drawer-request" key={`${item.kind}-${item.id}`}><span className={`request-icon ${tone}`}><Icon size={19} weight="fill" /></span><div><strong>{item.table}</strong><p>{item.type}</p><small>{item.summary || "Recién recibido"}</small></div></article>;
        })}
        {!requests.length && <div className="empty-state"><CheckCircle size={28} /><strong>Todo al día</strong><p>No hay solicitudes pendientes.</p></div>}
        <button className="primary-button full" type="button" onClick={onRoom}>Gestionar la sala</button>
      </aside>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast" role="status"><CheckCircle size={20} weight="fill" />{message}</div>;
}

function LoadingScreen({ message = "Preparando tu restaurante" }) {
  return <main className="auth-page"><section className="auth-card loading-card"><span className="auth-brand">Cart<i>IA</i></span><SpinnerGap className="spin" size={34} /><h1>{message}</h1><p>Estamos conectando la carta, las mesas y el servicio.</p></section></main>;
}

function LoginScreen({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(error || "");

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setFormError("");
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setFormError(loginError.message || "No se pudo iniciar sesión");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-intro"><span className="auth-brand">Cart<i>IA</i></span><p className="eyebrow">PANEL DEL RESTAURANTE</p><h1>Todo tu salón,<br />en un solo lugar.</h1><p>Gestioná la carta, los videos, las mesas y cada pedido que llega desde los QR.</p></div>
        <form onSubmit={submit}>
          <div><h2>Ingresá a tu cuenta</h2><p>La cuenta la entrega el administrador de CartIA.</p></div>
          <label>Email del restaurante<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hola@restaurante.com" required /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••" required /></label>
          {formError && <div className="auth-error"><WarningCircle size={18} /> {formError}</div>}
          <button className="primary-button full" type="submit" disabled={sending}>{sending ? <SpinnerGap className="spin" size={18} /> : <Storefront size={18} />} Entrar al panel</button>
          <small>No hay registro público. Si necesitas acceso, solicítalo al equipo de CartIA.</small>
        </form>
      </section>
    </main>
  );
}

export function App() {
  const [screen, navigate] = useHashScreen();
  const [period, setPeriod] = useState("Últimos 7 días");
  const [railVisible, setRailVisible] = useState(true);
  const railOperationKey = useRef("");
  const [drawer, setDrawer] = useState(null);
  const [toast, setToast] = useState("");
  const [menuDishes, setMenuDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [serviceOptions, setServiceOptions] = useState({ waiter: true, bill: true });
  const [visualTheme, setVisualTheme] = useState({
    primary: "#173d31",
    accent: "#f0b44d",
    paper: "#f6f0e5",
    name: "Tema editorial",
  });
  const [publishedVideos, setPublishedVideos] = useState({});
  const [authStatus, setAuthStatus] = useState("loading");
  const [csrf, setCsrf] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [appError, setAppError] = useState("");
  const [restaurant, setRestaurant] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [tables, setTables] = useState([]);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const publicParams = useMemo(getPublicParams, []);
  const isLegacyQrGuest = screen === "menu" && Boolean(publicParams.restaurant && publicParams.tableToken);
  const isPublicGuest = isRestaurantDomain || isLegacyQrGuest;
  const hasTableContext = isPublicGuest && Boolean(publicParams.tableToken);
  const liveOperations = useMemo(() => [
    ...requests,
    ...orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).map((order) => ({
      ...order,
      kind: "order",
      type: order.status === "NEW" ? "Nuevo pedido" : order.status === "READY" ? "Pedido listo" : "Pedido en preparación",
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [requests, orders]);
  const liveOperationKey = liveOperations.map((item) => `${item.kind}-${item.id}-${item.status || item.requestType}`).join("|");

  const applyBootstrap = (data) => {
    if (data.restaurant) setRestaurant(data.restaurant);
    if (data.table) setActiveTable(data.table);
    if (data.dishes) {
      setMenuDishes(data.dishes);
      setPublishedVideos(Object.fromEntries(data.dishes.filter((dish) => dish.video).map((dish) => [dish.id, dish.video])));
    }
    if (data.categories) setCategories(data.categories);
    if (data.serviceOptions) setServiceOptions(data.serviceOptions);
    if (data.visualTheme) setVisualTheme(data.visualTheme);
    if (data.tables) setTables(data.tables);
    if (data.csrf) setCsrf(data.csrf);
    if (data.user) setCurrentUser(data.user);
    if (data.user?.locationId) setActiveLocationId(data.user.locationId);
  };

  const loadRequests = async () => {
    const data = await cartiaApi.operations();
    setRequests(data.serviceRequests || []);
    setOrders(data.orders || []);
  };

  useEffect(() => {
    if (liveOperationKey && liveOperationKey !== railOperationKey.current) setRailVisible(true);
    railOperationKey.current = liveOperationKey;
  }, [liveOperationKey]);

  const loadAnalytics = async () => {
    const days = period === "Hoy" ? 1 : period === "Últimos 30 días" ? 30 : 7;
    const data = await cartiaApi.analytics(days);
    setAnalytics(data);
  };

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (isRootDomain) {
        if (!cancelled) setAuthStatus("landing");
        return;
      }
      if (isPublicGuest) {
        try {
          const data = await cartiaApi.publicMenu(publicParams);
          if (!cancelled) {
            applyBootstrap(data);
            setAuthStatus("public");
            if (isRestaurantDomain && window.location.hash !== "#menu") window.location.hash = "menu";
          }
        } catch (error) {
          if (!cancelled) {
            setAppError(error.message || "No se pudo abrir esta carta");
            setAuthStatus("public-error");
          }
        }
        return;
      }
      try {
        const session = await cartiaApi.me();
        if (!session.authenticated) {
          if (!cancelled) setAuthStatus("unauthenticated");
          return;
        }
        if (session.user?.role === "superadmin") {
          const clientData = await cartiaApi.restaurants();
          if (!cancelled) {
            setCurrentUser(session.user);
            setActiveLocationId(null);
            setCsrf(session.csrf || "");
            setOrganizations(clientData.organizations || []);
            setClients(clientData.restaurants || []);
            setAuthStatus("superadmin");
            navigate("admin");
          }
          return;
        }
        const data = await cartiaApi.bootstrap();
        if (!cancelled) {
          setCurrentUser(session.user);
          setActiveLocationId(session.user?.locationId || session.user?.locations?.[0]?.id || null);
          setCsrf(session.csrf || "");
          applyBootstrap(data);
          setAuthStatus("authenticated");
          loadRequests().catch(() => null);
        }
      } catch (error) {
        if (!cancelled) {
          setAppError(error.message || "No se pudo conectar con CartIA");
          setAuthStatus("unauthenticated");
        }
      }
    };
    start();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return undefined;
    const timer = window.setInterval(() => loadRequests().catch(() => null), 4000);
    return () => window.clearInterval(timer);
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== "authenticated") return undefined;
    const source = cartiaApi.adminEvents(() => loadRequests().catch(() => null));
    source.onerror = () => null;
    return () => source.close();
  }, [authStatus, activeLocationId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    loadAnalytics().catch(() => null);
  }, [authStatus, period]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !csrf) return undefined;
    const timer = window.setTimeout(() => {
      cartiaApi.saveSettings(serviceOptions, visualTheme, csrf).catch((error) => showToast(error.message));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [serviceOptions, visualTheme, authStatus, csrf]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const openRoom = () => {
    setDrawer(null);
    navigate("mesas");
  };

  const activeLabel = useMemo(() => screen === "menu" ? `Carta de ${restaurant?.name || "cliente"}` : navItems.find((item) => item.id === screen)?.label || "Administración", [screen, restaurant?.name]);

  useEffect(() => {
    document.title = `${activeLabel} · CartIA`;
  }, [activeLabel]);

  const login = async (email, password) => {
    const session = await cartiaApi.login(email, password);
    setCsrf(session.csrf || "");
    setCurrentUser(session.user || null);
    setActiveLocationId(session.user?.locationId || session.user?.locations?.[0]?.id || null);
    if (session.user?.role === "superadmin") {
      const clientData = await cartiaApi.restaurants();
      setActiveLocationId(null);
      setOrganizations(clientData.organizations || []);
      setClients(clientData.restaurants || []);
      setAuthStatus("superadmin");
      navigate("admin");
      return;
    }
    const data = await cartiaApi.bootstrap();
    applyBootstrap(data);
    setAuthStatus("authenticated");
    await loadRequests();
  };
  const logout = async () => {
    try { await cartiaApi.logout(csrf); } catch { /* La sesión local también debe limpiarse si la red falla. */ }
    setCurrentUser(null); setActiveLocationId(null); setRestaurant(null); setTables([]); setRequests([]); setOrders([]); setMenuDishes([]); setCategories([]); setAnalytics(null); setAuthStatus("unauthenticated"); navigate("inicio");
  };

  if (authStatus === "loading") return <LoadingScreen message={isPublicGuest ? "Abriendo la carta" : "Preparando tu restaurante"} />;
  if (authStatus === "landing") return <MarketingLanding />;
  if (authStatus === "public-error") return <main className="auth-page"><section className="auth-card loading-card"><WarningCircle size={38} /><h1>No pudimos abrir esta carta</h1><p>{appError}</p><small>Pedí al restaurante que verifique el enlace o el QR de la mesa.</small></section></main>;
  if (authStatus === "unauthenticated") return <LoginScreen onLogin={login} error={appError} />;

  const connected = authStatus === "authenticated" || authStatus === "superadmin";
  const createRestaurant = async (draft) => {
    if (authStatus !== "superadmin") return;
    const response = await cartiaApi.createRestaurant(draft, csrf);
    const refreshed = await cartiaApi.organizations();
    setOrganizations(refreshed.organizations || []);
    setClients((current) => [{ ...response.restaurant, status: "active" }, ...current]);
    return response.restaurant;
  };
  const loadOrganizationUsers = (organizationId) => cartiaApi.organizationUsers(organizationId);
  const createOrganizationUser = (organizationId, user) => cartiaApi.createOrganizationUser(organizationId, user, csrf);
  const selectLocation = async (locationId) => {
    if ((!connected && authStatus !== "superadmin") || !locationId || locationId === activeLocationId) return;
    const response = await cartiaApi.selectLocation(locationId, csrf);
    setRequests([]);
    setOrders([]);
    setActiveLocationId(locationId);
    setCurrentUser(response.user);
    const data = await cartiaApi.bootstrap();
    applyBootstrap(data);
    await loadRequests();
    if (authStatus === "superadmin") { setAuthStatus("authenticated"); navigate("inicio"); }
  };
  const refreshOrganizations = async () => { const data = await cartiaApi.organizations(); setOrganizations(data.organizations || []); };
  const saveDish = async (dish) => {
    if (!connected) return {};
    const response = await cartiaApi.saveDish(dish, csrf);
    let savedDish = response.dish;
    if (dish.imageFile) {
      try {
        const uploaded = await cartiaApi.uploadDishImage(dish.imageFile, savedDish.databaseId, csrf);
        savedDish = { ...savedDish, image: uploaded.image, imageFile: undefined };
      } catch (error) {
        await refreshCatalog();
        throw new Error(`El plato fue guardado, pero no se pudo cargar la foto. Podés reintentarla al editarlo. ${error.message || ""}`.trim());
      }
    }
    if (dish.videoFile) {
      try {
        const uploaded = await cartiaApi.uploadVideo(dish.videoFile, savedDish, {}, csrf);
        savedDish = { ...savedDish, video: uploaded.video, videoFile: undefined, videoName: undefined };
      } catch (error) {
        await refreshCatalog();
        throw new Error(`El plato fue guardado, pero no se pudo cargar el video. Podés reintentarla al editarlo. ${error.message || ""}`.trim());
      }
    }
    return savedDish;
  };
  const addTable = async (label) => {
    const response = await cartiaApi.createTable(label, csrf);
    setTables((current) => [...current, response.table]);
  };
  const archiveTable = async (table, archive) => {
    await cartiaApi.archiveTable(table.id, archive, csrf);
    await refreshCatalog();
  };
  const resolveRequest = async (item) => {
    if (connected) await cartiaApi.resolveRequest(item, csrf);
    await loadRequests();
  };
  const updateOrderStatus = async (order, status) => {
    if (connected) await cartiaApi.updateOrderStatus(order.id, status, csrf);
    await loadRequests();
  };
  const archiveDish = (id, archive) => cartiaApi.archiveDish(id, archive, csrf);
  const reorderDishes = (ids) => cartiaApi.reorderDishes(ids, csrf);
  const saveCategory = (category) => cartiaApi.saveCategory(category, csrf);
  const archiveCategory = (id, archive) => cartiaApi.archiveCategory(id, archive, csrf);
  const reorderCategories = (ids) => cartiaApi.reorderCategories(ids, csrf);
  const refreshCatalog = async () => { if (!connected) return; applyBootstrap(await cartiaApi.bootstrap()); };
  const uploadVideo = async (file, dish, metadata, onProgress) => {
    const response = await cartiaApi.uploadVideo(file, dish, metadata, csrf, onProgress);
    return response.video;
  };
  const removeVideo = async (dishId) => {
    await cartiaApi.removeDishMedia(dishId, "VIDEO", csrf);
    await refreshCatalog();
  };
  const removeImage = async (dishId) => {
    try {
      await cartiaApi.removeDishMedia(dishId, "IMAGE", csrf);
      await refreshCatalog();
      showToast("Foto eliminada de la carta");
    } catch (error) {
      showToast(error.message || "No se pudo eliminar la foto");
      throw error;
    }
  };
  const uploadLogo = async (file) => {
    const response = await cartiaApi.uploadLogo(file, csrf);
    setRestaurant((current) => ({ ...current, logo: response.logo }));
  };
  const publicServiceRequest = (type) => hasTableContext ? cartiaApi.serviceRequest({ ...publicParams, type }) : isPublicGuest ? Promise.reject(new Error("Escaneá el QR de tu mesa para usar esta opción.")) : Promise.resolve({ ok: true });
  const publicOrder = (items) => hasTableContext ? cartiaApi.order({ ...publicParams, items }) : isPublicGuest ? Promise.reject(new Error("Escaneá el QR de tu mesa para realizar un pedido.")) : Promise.resolve({ ok: true });
  const publicEvent = (event) => {
    if (hasTableContext) cartiaApi.event({ ...publicParams, ...event }).catch(() => null);
  };

  if (screen === "menu") {
    return (
      <>
        <GuestMenu
          videoAssets={publishedVideos}
          menuDishes={menuDishes}
          serviceOptions={serviceOptions}
          visualTheme={visualTheme}
          restaurant={restaurant}
          table={activeTable}
          isPublic={isPublicGuest}
          hasTableContext={hasTableContext}
          onExit={() => navigate("carta")}
          onToast={showToast}
          onServiceRequest={publicServiceRequest}
          onSubmitOrder={publicOrder}
          onEvent={publicEvent}
        />
        <Toast message={toast} />
      </>
    );
  }

  let content;
  if (screen === "carta") content = <CartaScreen menuDishes={menuDishes} categories={categories} restaurant={restaurant} onMenuDishes={setMenuDishes} onCategories={setCategories} onToast={showToast} onOpenGuest={() => navigate("menu")} onSaveDish={saveDish} onRemoveImage={removeImage} onRemoveVideo={removeVideo} onArchiveDish={archiveDish} onReorderDishes={reorderDishes} onSaveCategory={saveCategory} onArchiveCategory={archiveCategory} onReorderCategories={reorderCategories} onRefresh={refreshCatalog} />;
  else if (screen === "analitica") content = <AnaliticaScreen period={period} onPeriod={setPeriod} analytics={analytics} />;
  else if (screen === "mesas") content = <MesasScreen onToast={showToast} tables={tables} requests={requests} orders={orders} onAddTable={addTable} onArchiveTable={archiveTable} onResolveRequest={resolveRequest} onUpdateOrder={updateOrderStatus} />;
  else if (screen === "estilo") content = <StyleScreen onToast={showToast} serviceOptions={serviceOptions} onServiceOptions={setServiceOptions} visualTheme={visualTheme} onVisualTheme={setVisualTheme} onOpenGuest={() => navigate("menu")} restaurant={restaurant} menuDishes={menuDishes} onUploadLogo={uploadLogo} />;
  else if (screen === "contenido") content = <ContentScreen onToast={showToast} onOpenGuest={() => navigate("menu")} publishedVideos={publishedVideos} onPublishVideos={setPublishedVideos} menuDishes={menuDishes} restaurant={restaurant} onUploadVideo={uploadVideo} onRemoveVideo={removeVideo} />;
  else if (screen === "admin") content = currentUser?.role === "superadmin"
    ? <PlatformAdminScreen organizations={organizations} onRefresh={refreshOrganizations} onToast={showToast} onCreateOrganization={(draft) => createRestaurant({ restaurantName: draft.name, locationSlug: draft.locationSlug, adminName: draft.ownerName, email: draft.ownerEmail, password: draft.ownerPassword })} onUpdateOrganization={(id, body) => cartiaApi.updateOrganization(id, body, csrf)} onAddLocation={(id, body) => cartiaApi.addLocation(id, body, csrf)} onUpdateLocation={(id, body) => cartiaApi.updateLocation(id, body, csrf)} onLoadUsers={loadOrganizationUsers} onCreateUser={createOrganizationUser} onUpdateUser={(id, body) => cartiaApi.updateUser(id, body, csrf)} onSelectLocation={selectLocation} />
    : <AdminScreen onToast={showToast} clients={clients} onCreateRestaurant={createRestaurant} onLoadUsers={loadOrganizationUsers} onCreateUser={createOrganizationUser} />;
  else content = <Dashboard period={period} onPeriod={setPeriod} onImprove={() => setDrawer("improve")} analytics={analytics} />;

  return (
    <div className="app-shell">
      <AppHeader user={currentUser} activeLocationId={activeLocationId} onSelectLocation={selectLocation} operations={liveOperations} onRequests={() => setDrawer("requests")} onLogout={logout} />
      {railVisible && liveOperations.length > 0 && screen !== "admin" && <RequestRail operations={liveOperations} onOpenRoom={openRoom} onDismiss={() => setRailVisible(false)} />}
      <div className={`app-body ${railVisible && liveOperations.length > 0 && screen !== "admin" ? "has-rail" : ""}`}>
        <Sidebar active={screen} onNavigate={navigate} onLogout={logout} />
        <div className="main-scroll">{content}</div>
      </div>
      <BottomNav active={screen} onNavigate={navigate} />
      {drawer === "improve" && <ImproveDrawer onClose={() => setDrawer(null)} onSave={() => { setDrawer(null); showToast("Mejora publicada en la carta"); }} />}
      {drawer === "requests" && <RequestsDrawer onClose={() => setDrawer(null)} onRoom={openRoom} requests={liveOperations} />}
      <Toast message={toast} />
    </div>
  );
}
