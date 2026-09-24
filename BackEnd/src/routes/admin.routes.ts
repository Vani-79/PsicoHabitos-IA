import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

export const adminRouter = Router();

/**
 * GET /api/admin/psychologists
 * Retorna la lista completa de psicólogos con el estado detallado de sus suscripciones.
 */
adminRouter.get('/api/admin/psychologists', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.id,
        p.usuario_id,
        p.nombre,
        p.apellidos,
        p.email,
        p.suscripcion_meses,
        DATE_FORMAT(p.suscripcion_inicio, '%Y-%m-%d') as suscripcion_inicio,
        DATE_FORMAT(p.suscripcion_fin, '%Y-%m-%d') as suscripcion_fin,
        p.suscripcion_activa,
        p.suscripcion_notas,
        DATEDIFF(p.suscripcion_fin, NOW()) as dias_restantes,
        (p.suscripcion_fin >= NOW() AND p.suscripcion_activa = 1) as is_valid,
        DATE_FORMAT(p.created_at, '%Y-%m-%d') as created_at
      FROM psicologos p
      ORDER BY p.created_at DESC`
    );

    const data = rows.map((r) => {
      const activa = Boolean(r.suscripcion_activa);
      const dias = r.dias_restantes !== null ? Number(r.dias_restantes) : 0;
      let estado: 'activa' | 'expirada' | 'pausada' = 'activa';

      if (!activa) {
        estado = 'pausada';
      } else if (dias < 0) {
        estado = 'expirada';
      } else {
        estado = 'activa';
      }

      return {
        id: r.id,
        usuarioId: r.usuario_id,
        nombre: r.nombre,
        apellidos: r.apellidos,
        email: r.email,
        mesesContratados: r.suscripcion_meses,
        inicio: r.suscripcion_inicio,
        fin: r.suscripcion_fin,
        activa,
        diasRestantes: dias,
        vigente: Boolean(r.is_valid),
        estado,
        notas: r.suscripcion_notas || '',
        createdAt: r.created_at,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en GET /api/admin/psychologists:', error);
    res.status(500).json({ success: false, error: 'Error al listar psicólogos' });
  }
});

/**
 * POST /api/admin/psychologists/:id/update-subscription
 * Endpoint unificado para actualizar el estado, extender meses y registrar notas de suscripción.
 */
adminRouter.post('/api/admin/psychologists/:id/update-subscription', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { activa, extendMonths, notas } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'ID de especialista no válido.' });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, apellidos, suscripcion_activa, suscripcion_fin, suscripcion_meses FROM psicologos WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Especialista no encontrado.' });
      return;
    }

    const current = rows[0];
    const newActiva = activa !== undefined ? Boolean(activa) : Boolean(current.suscripcion_activa);
    const monthsToAdd = Math.max(0, Number(extendMonths) || 0);

    if (monthsToAdd > 0) {
      // Extender a partir de NOW() si ya venció, o de la fecha fin si aún está vigente
      await pool.query(
        `UPDATE psicologos 
         SET suscripcion_fin = DATE_ADD(GREATEST(suscripcion_fin, NOW()), INTERVAL ? MONTH),
             suscripcion_meses = suscripcion_meses + ?,
             suscripcion_activa = ?,
             suscripcion_notas = COALESCE(?, suscripcion_notas)
         WHERE id = ?`,
        [monthsToAdd, monthsToAdd, newActiva, notas || null, id]
      );
    } else {
      // Sin extensión de meses, se actualiza el estado activo/inactivo
      // Si el administrador activa una suscripción que estaba vencida, se renueva automáticamente por 1 mes desde hoy
      await pool.query(
        `UPDATE psicologos 
         SET suscripcion_activa = ?,
             suscripcion_fin = CASE 
               WHEN ? = TRUE AND suscripcion_fin < NOW() THEN DATE_ADD(NOW(), INTERVAL 1 MONTH)
               ELSE suscripcion_fin 
             END,
             suscripcion_notas = COALESCE(?, suscripcion_notas)
         WHERE id = ?`,
        [newActiva, newActiva, notas || null, id]
      );
    }

    const [updatedRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, nombre, apellidos, email, suscripcion_meses,
              DATE_FORMAT(suscripcion_inicio, '%Y-%m-%d') as suscripcion_inicio,
              DATE_FORMAT(suscripcion_fin, '%Y-%m-%d') as suscripcion_fin,
              suscripcion_activa,
              DATEDIFF(suscripcion_fin, NOW()) as dias_restantes,
              (suscripcion_fin >= NOW() AND suscripcion_activa = 1) as is_valid
       FROM psicologos WHERE id = ? LIMIT 1`,
      [id]
    );

    const u = updatedRows[0];
    res.json({
      success: true,
      message: `Suscripción de ${u.nombre} ${u.apellidos} actualizada con éxito.`,
      data: {
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        activa: Boolean(u.suscripcion_activa),
        fin: u.suscripcion_fin,
        diasRestantes: u.dias_restantes,
        vigente: Boolean(u.is_valid),
      },
    });
  } catch (error) {
    console.error('Error en update-subscription:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar suscripción' });
  }
});

/**
 * GET /admin/psychologists y GET /AdministracionPsicologos
 * Portal Web Administrativo Premium para la Gestión de Suscripciones.
 */
adminRouter.get(['/admin/psychologists', '/AdministracionPsicologos', '/administracionpsicologos'], (_req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestión de Especialistas y Suscripciones — PsicoHábitos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0F613B;
      --primary-hover: #147A4B;
      --primary-light: #E8F5E9;
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --bg: #F4F7F6;
      --card-bg: #FFFFFF;
      --text-main: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 14px rgba(0,0,0,0.06);
      --shadow-lg: 0 12px 30px rgba(0,0,0,0.12);
      --radius: 14px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      padding: 32px 20px 60px 20px;
    }

    .container {
      max-width: 1140px;
      margin: 0 auto;
    }

    /* TOP BAR / BRANDING */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0F613B, #1DB973);
      color: #FFFFFF;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(15, 97, 59, 0.25);
    }

    .brand-text h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0F613B;
      letter-spacing: -0.5px;
    }

    .brand-text p {
      font-size: 13.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-create {
      background: var(--primary);
      color: #FFFFFF;
      text-decoration: none;
      padding: 11px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(15, 97, 59, 0.2);
    }

    .btn-create:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    /* STATS SUMMARY */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-box {
      background: var(--card-bg);
      border-radius: var(--radius);
      padding: 20px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
    }

    .stat-num {
      font-size: 32px;
      font-weight: 800;
      color: var(--text-main);
      margin-top: 4px;
      line-height: 1;
    }

    .stat-badge-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    /* CARD CONTAINER */
    .main-card {
      background: var(--card-bg);
      border-radius: 18px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .table-toolbar {
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      background: #FAFBFB;
    }

    .search-input-wrap {
      position: relative;
      width: 320px;
      max-width: 100%;
    }

    .search-input-wrap input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      background: #FFFFFF;
    }

    .search-input-wrap input:focus {
      border-color: var(--primary);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94A3B8;
      font-size: 16px;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-select {
      padding: 9px 12px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-size: 13.5px;
      outline: none;
      background: #FFFFFF;
      color: var(--text-main);
    }

    /* TABLE */
    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      padding: 14px 24px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #475569;
      background: #FAFBFB;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 18px 24px;
      font-size: 14px;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: #F8FAF9;
    }

    .specialist-cell {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .specialist-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #E8F5E9;
      color: #0F613B;
      font-weight: 800;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #C8E6C9;
      flex-shrink: 0;
    }

    .specialist-info .name {
      font-weight: 700;
      color: var(--text-main);
      font-size: 15px;
    }

    .specialist-info .email {
      font-size: 12.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .pill-activa {
      background: #DEF7EC;
      color: #03543F;
    }
    .pill-activa .status-dot { background: #0E9F6E; }

    .pill-expirada {
      background: #FDE8E8;
      color: #9B1C1C;
    }
    .pill-expirada .status-dot { background: #E02424; }

    .pill-pausada {
      background: #F1F5F9;
      color: #475569;
    }
    .pill-pausada .status-dot { background: #64748B; }

    .days-badge {
      font-weight: 700;
      font-size: 13.5px;
    }

    .btn-manage {
      background: #FFFFFF;
      color: #0F613B;
      border: 1.5px solid #0F613B;
      padding: 8px 16px;
      border-radius: 9px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-manage:hover {
      background: #0F613B;
      color: #FFFFFF;
      box-shadow: 0 3px 8px rgba(15, 97, 59, 0.2);
    }

    /* MODAL OVERLAY & CARD */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: #FFFFFF;
      border-radius: 20px;
      max-width: 540px;
      width: 100%;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border);
      overflow: hidden;
      animation: modalSlideUp 0.25s ease-out;
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FAFBFB;
    }

    .modal-header h3 {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-main);
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #94A3B8;
      border-radius: 8px;
      padding: 4px 8px;
      line-height: 1;
    }

    .btn-close-modal:hover {
      background: #E2E8F0;
      color: var(--text-main);
    }

    .modal-body {
      padding: 24px;
    }

    .specialist-summary-banner {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .form-section {
      margin-bottom: 20px;
    }

    .form-section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    /* SEGMENTED STATUS PICKER */
    .status-picker-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .status-option-card {
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.15s;
    }

    .status-option-card:hover {
      border-color: #CBD5E1;
    }

    .status-option-card.selected {
      border-color: var(--primary);
      background: #F0FDF4;
    }

    .status-option-card.selected-disabled {
      border-color: var(--danger);
      background: #FEF2F2;
    }

    .status-option-title {
      font-size: 14px;
      font-weight: 700;
    }

    .status-option-desc {
      font-size: 11.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* EXTENSION SELECTOR */
    .form-select {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-size: 14.5px;
      outline: none;
      background: #FFFFFF;
      color: var(--text-main);
      font-family: inherit;
    }

    .form-select:focus {
      border-color: var(--primary);
    }

    .date-preview-box {
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      font-size: 13px;
      color: #1E40AF;
      line-height: 1.5;
    }

    .form-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      resize: vertical;
      min-height: 55px;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #FAFBFB;
    }

    .btn-secondary {
      background: #FFFFFF;
      color: #475569;
      border: 1.5px solid var(--border);
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-submit-action {
      background: var(--primary);
      color: #FFFFFF;
      border: none;
      padding: 10px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 10px rgba(15, 97, 59, 0.25);
    }

    .btn-submit-action:hover {
      background: var(--primary-hover);
    }

    /* CONFIRMATION POPUP DIALOG */
    .confirm-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 20px;
    }

    .confirm-dialog {
      background: #FFFFFF;
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
      padding: 24px;
      box-shadow: var(--shadow-lg);
      text-align: center;
      animation: modalSlideUp 0.2s ease-out;
    }

    .confirm-dialog-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #FEF3C7;
      color: #D97706;
      font-size: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px auto;
    }

    .confirm-dialog h4 {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .confirm-dialog p {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .confirm-dialog-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    /* TOAST */
    .toast-notification {
      position: fixed;
      bottom: 28px;
      right: 28px;
      background: #0F172A;
      color: #FFFFFF;
      padding: 14px 22px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      display: none;
      align-items: center;
      gap: 10px;
      z-index: 2000;
      animation: toastIn 0.25s ease-out;
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- CABECERA -->
    <header class="top-header">
      <div class="brand-title">
        <div class="brand-icon">🛡️</div>
        <div class="brand-text">
          <h1>Gestión de Especialistas y Suscripciones</h1>
          <p>Supervisa el estado de habilitación clínica de los psicólogos y administra sus períodos de suscripción.</p>
        </div>
      </div>
      <div class="header-actions">
        <a href="/register-psychologist" class="btn-create">
          ➕ Registrar Nuevo Especialista
        </a>
      </div>
    </header>

    <!-- RESUMEN DE MÉTRICAS -->
    <div class="stats-row">
      <div class="stat-box">
        <div>
          <div class="stat-label">Total Especialistas</div>
          <div class="stat-num" id="statTotal">—</div>
        </div>
        <div class="stat-badge-icon" style="background: #E0F2FE; color: #0284C7;">👥</div>
      </div>

      <div class="stat-box">
        <div>
          <div class="stat-label">Suscripciones Activas</div>
          <div class="stat-num" id="statActivas" style="color: #0F613B;">—</div>
        </div>
        <div class="stat-badge-icon" style="background: #DEF7EC; color: #0E9F6E;">✅</div>
      </div>

      <div class="stat-box">
        <div>
          <div class="stat-label">Pausadas o Vencidas</div>
          <div class="stat-num" id="statInactivas" style="color: #DC2626;">—</div>
        </div>
        <div class="stat-badge-icon" style="background: #FEE2E2; color: #DC2626;">⚠️</div>
      </div>
    </div>

    <!-- TARJETA PRINCIPAL Y TABLA -->
    <div class="main-card">
      <div class="table-toolbar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="searchInput" placeholder="Buscar por nombre o correo...">
        </div>

        <div class="filter-group">
          <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Estado:</label>
          <select id="filterStatus" class="filter-select">
            <option value="todos">Todos los especialistas</option>
            <option value="activa">Solo Activas</option>
            <option value="expirada">Solo Vencidas</option>
            <option value="pausada">Solo Pausadas</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Especialista</th>
              <th>Plan Acumulado</th>
              <th>Fecha de Vencimiento</th>
              <th>Días Restantes</th>
              <th>Estado</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody id="psychologistsTableBody">
            <tr>
              <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;">
                Cargando especialistas...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- MODAL DE GESTIÓN DE SUSCRIPCIÓN -->
  <div id="manageModal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Gestionar Suscripción</h3>
        <button id="btnCloseModal" class="btn-close-modal" type="button">✕</button>
      </div>

      <div class="modal-body">
        <!-- Resumen del Especialista -->
        <div class="specialist-summary-banner">
          <div id="modalAvatar" class="specialist-avatar">--</div>
          <div>
            <div id="modalSpecialistName" style="font-weight: 800; font-size: 15px;">-</div>
            <div id="modalSpecialistEmail" style="font-size: 13px; color: var(--text-muted);">-</div>
          </div>
        </div>

        <!-- 1. Estado de la Suscripción -->
        <div class="form-section">
          <div class="form-section-title">1. Estado de Acceso a la Plataforma</div>
          <div class="status-picker-grid">
            <div id="optActive" class="status-option-card selected" data-status="true">
              <span style="font-size: 20px;">🟢</span>
              <div>
                <div class="status-option-title">Activa (Habilitada)</div>
                <div class="status-option-desc">Acceso completo a fichas y agenda</div>
              </div>
            </div>

            <div id="optPaused" class="status-option-card" data-status="false">
              <span style="font-size: 20px;">⏸️</span>
              <div>
                <div class="status-option-title">Pausada (Bloqueada)</div>
                <div class="status-option-desc">Solo podrá navegar y ver aviso</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Extender Suscripción -->
        <div class="form-section">
          <div class="form-section-title">2. Extender Tiempo de Suscripción</div>
          <select id="selectExtendMonths" class="form-select">
            <option value="0">Mantener fecha actual (Sin extensión)</option>
            <option value="1">+1 Mes (Plan Mensual)</option>
            <option value="3">+3 Meses (Plan Trimestral)</option>
            <option value="6">+6 Meses (Plan Semestral)</option>
            <option value="12">+12 Meses (Plan Anual)</option>
          </select>

          <div id="datePreviewBox" class="date-preview-box">
            📅 <strong>Vencimiento actual:</strong> <span id="currentFinDate">—</span><br>
            ➡️ <strong>Nueva fecha calculada:</strong> <span id="newFinDate" style="font-weight: 800;">—</span>
          </div>
        </div>

        <!-- 3. Registro de Transferencia / Notas -->
        <div class="form-section" style="margin-bottom: 0;">
          <div class="form-section-title">3. Notas / Referencia de Transferencia (Opcional)</div>
          <textarea id="modalNotas" class="form-textarea" placeholder="Ej. Transferencia BancoEstado comprobante #48192"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button id="btnCancelModal" class="btn-secondary" type="button">Cancelar</button>
        <button id="btnOpenConfirm" class="btn-submit-action" type="button">
          Continuar y Confirmar...
        </button>
      </div>
    </div>
  </div>

  <!-- DIÁLOGO EMERGENTE DE CONFIRMACIÓN -->
  <div id="confirmDialog" class="confirm-dialog-overlay">
    <div class="confirm-dialog">
      <div class="confirm-dialog-icon">⚠️</div>
      <h4>¿Confirmar Cambios?</h4>
      <p id="confirmMessageText">
        ¿Estás seguro de que deseas guardar estos cambios en la suscripción?
      </p>
      <div class="confirm-dialog-buttons">
        <button id="btnCancelConfirm" class="btn-secondary" type="button">Volver</button>
        <button id="btnApplyConfirm" class="btn-submit-action" type="button">
          Sí, Aplicar Cambios
        </button>
      </div>
    </div>
  </div>

  <!-- TOAST DE NOTIFICACIÓN -->
  <div id="toast" class="toast-notification"></div>

  <script>
    let psychologistsList = [];
    let currentEditingPsychologist = null;
    let selectedActiveState = true;

    // Elementos DOM
    const tbody = document.getElementById('psychologistsTableBody');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const manageModal = document.getElementById('manageModal');
    const confirmDialog = document.getElementById('confirmDialog');
    const toast = document.getElementById('toast');

    const optActive = document.getElementById('optActive');
    const optPaused = document.getElementById('optPaused');
    const selectExtendMonths = document.getElementById('selectExtendMonths');
    const currentFinDateSpan = document.getElementById('currentFinDate');
    const newFinDateSpan = document.getElementById('newFinDate');
    const modalNotas = document.getElementById('modalNotas');

    function showToast(msg) {
      toast.innerHTML = '<span>✅</span> ' + msg;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }

    async function loadPsychologists() {
      try {
        const res = await fetch('/api/admin/psychologists');
        const json = await res.json();
        if (json.success) {
          psychologistsList = json.data;
          renderTable();
          updateStats();
        }
      } catch (err) {
        console.error('Error cargando psicólogos:', err);
      }
    }

    function updateStats() {
      document.getElementById('statTotal').textContent = psychologistsList.length;
      const activas = psychologistsList.filter(p => p.estado === 'activa').length;
      document.getElementById('statActivas').textContent = activas;
      document.getElementById('statInactivas').textContent = psychologistsList.length - activas;
    }

    function renderTable() {
      const query = searchInput.value.toLowerCase().trim();
      const statusFilter = filterStatus.value;

      const filtered = psychologistsList.filter(p => {
        const matchesQuery = (p.nombre + ' ' + p.apellidos).toLowerCase().includes(query) ||
                             p.email.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'todos' || p.estado === statusFilter;
        return matchesQuery && matchesStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 40px;">No se encontraron especialistas con los criterios seleccionados.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(p => {
        const initials = ((p.nombre[0] || '') + (p.apellidos[0] || '')).toUpperCase();
        
        let pillClass = 'pill-activa';
        let pillLabel = 'Activa';
        if (p.estado === 'pausada') {
          pillClass = 'pill-pausada';
          pillLabel = 'Pausada';
        } else if (p.estado === 'expirada') {
          pillClass = 'pill-expirada';
          pillLabel = 'Finalizada';
        }

        let daysText = '—';
        let daysColor = '#0F172A';
        if (p.diasRestantes !== null) {
          if (p.diasRestantes < 0) {
            daysText = 'Vencida (' + Math.abs(p.diasRestantes) + ' días)';
            daysColor = '#DC2626';
          } else if (p.diasRestantes <= 5) {
            daysText = p.diasRestantes + ' días (Crítico)';
            daysColor = '#D97706';
          } else {
            daysText = p.diasRestantes + ' días';
            daysColor = '#0F613B';
          }
        }

        return \`
          <tr>
            <td>
              <div class="specialist-cell">
                <div class="specialist-avatar">\${initials}</div>
                <div class="specialist-info">
                  <div class="name">\${p.nombre} \${p.apellidos}</div>
                  <div class="email">\${p.email}</div>
                </div>
              </div>
            </td>
            <td>
              <strong>\${p.mesesContratados} mes(es)</strong>
            </td>
            <td>
              <span style="font-weight: 600;">\${p.fin || 'Sin definir'}</span>
            </td>
            <td>
              <span class="days-badge" style="color: \${daysColor};">\${daysText}</span>
            </td>
            <td>
              <span class="status-pill \${pillClass}">
                <span class="status-dot"></span>
                \${pillLabel}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="btn-manage" data-action="manage" data-id="\${p.id}">
                ⚙️ Gestionar Suscripción
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    // ABRIR MODAL DE GESTIÓN
    function openManageModal(id) {
      const p = psychologistsList.find(item => item.id === id);
      if (!p) return;

      currentEditingPsychologist = p;
      selectedActiveState = p.activa;

      const initials = ((p.nombre[0] || '') + (p.apellidos[0] || '')).toUpperCase();
      document.getElementById('modalAvatar').textContent = initials;
      document.getElementById('modalSpecialistName').textContent = p.nombre + ' ' + p.apellidos;
      document.getElementById('modalSpecialistEmail').textContent = p.email + ' · Plan: ' + p.mesesContratados + ' mes(es)';
      modalNotas.value = p.notas || '';

      selectExtendMonths.value = '0';
      updateStatusCardsUI();
      updateDatePreview();

      manageModal.style.display = 'flex';
    }

    function updateStatusCardsUI() {
      if (selectedActiveState) {
        optActive.className = 'status-option-card selected';
        optPaused.className = 'status-option-card';
      } else {
        optActive.className = 'status-option-card';
        optPaused.className = 'status-option-card selected-disabled';
      }
    }

    function updateDatePreview() {
      if (!currentEditingPsychologist) return;

      const monthsToAdd = Number(selectExtendMonths.value) || 0;
      const currentFin = currentEditingPsychologist.fin || new Date().toISOString().split('T')[0];
      currentFinDateSpan.textContent = currentFin;

      // Cálculo visual estimado
      let baseDate = new Date();
      if (new Date(currentFin) > baseDate) {
        baseDate = new Date(currentFin);
      }

      if (monthsToAdd > 0) {
        baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
        newFinDateSpan.textContent = baseDate.toISOString().split('T')[0] + ' (+' + monthsToAdd + ' mes' + (monthsToAdd > 1 ? 'es' : '') + ')';
      } else {
        if (!selectedActiveState) {
          newFinDateSpan.textContent = currentFin + ' (Acceso pausado inmediatamente)';
        } else if (currentEditingPsychologist.diasRestantes < 0) {
          // Si activa una vencida sin extensión, renueva por 1 mes
          const autoRenew = new Date();
          autoRenew.setMonth(autoRenew.getMonth() + 1);
          newFinDateSpan.textContent = autoRenew.toISOString().split('T')[0] + ' (Reactivación por 1 mes)';
        } else {
          newFinDateSpan.textContent = currentFin + ' (Sin cambios de fecha)';
        }
      }
    }

    // Delegación de eventos para la tabla
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="manage"]');
      if (btn) {
        const id = Number(btn.getAttribute('data-id'));
        openManageModal(id);
      }
    });

    // Eventos del modal
    optActive.addEventListener('click', () => {
      selectedActiveState = true;
      updateStatusCardsUI();
      updateDatePreview();
    });

    optPaused.addEventListener('click', () => {
      selectedActiveState = false;
      updateStatusCardsUI();
      updateDatePreview();
    });

    selectExtendMonths.addEventListener('change', updateDatePreview);

    function closeModal() {
      manageModal.style.display = 'none';
      confirmDialog.style.display = 'none';
      currentEditingPsychologist = null;
    }

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    // Diálogo de Confirmación
    document.getElementById('btnOpenConfirm').addEventListener('click', () => {
      if (!currentEditingPsychologist) return;

      const p = currentEditingPsychologist;
      const months = Number(selectExtendMonths.value) || 0;
      let actionDesc = '';

      if (!selectedActiveState) {
        actionDesc = 'Se <strong>PAUSARÁ</strong> la suscripción de <strong>' + p.nombre + ' ' + p.apellidos + '</strong>. El especialista solo podrá navegar y verá el aviso de renovación.';
      } else if (months > 0) {
        actionDesc = 'Se <strong>EXTENDERÁ</strong> la suscripción de <strong>' + p.nombre + ' ' + p.apellidos + '</strong> por <strong>+' + months + ' mes(es)</strong> adicionales.';
      } else {
        actionDesc = 'Se mantendrá la suscripción <strong>ACTIVA</strong> para <strong>' + p.nombre + ' ' + p.apellidos + '</strong>.';
      }

      document.getElementById('confirmMessageText').innerHTML = actionDesc + '<br><br>¿Confirmas aplicar esta acción inmediatamente?';
      confirmDialog.style.display = 'flex';
    });

    document.getElementById('btnCancelConfirm').addEventListener('click', () => {
      confirmDialog.style.display = 'none';
    });

    // Guardar definitivamente
    document.getElementById('btnApplyConfirm').addEventListener('click', async () => {
      if (!currentEditingPsychologist) return;

      const p = currentEditingPsychologist;
      const applyBtn = document.getElementById('btnApplyConfirm');
      applyBtn.disabled = true;
      applyBtn.textContent = 'Guardando...';

      const payload = {
        activa: selectedActiveState,
        extendMonths: Number(selectExtendMonths.value) || 0,
        notas: modalNotas.value.trim(),
      };

      try {
        const res = await fetch('/api/admin/psychologists/' + p.id + '/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          closeModal();
          showToast(data.message);
          await loadPsychologists();
        } else {
          alert('❌ ' + (data.error || 'Ocurrió un error al actualizar la suscripción.'));
        }
      } catch (err) {
        console.error('Error al guardar:', err);
        alert('❌ Error de conexión al guardar los cambios.');
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Sí, Aplicar Cambios';
      }
    });

    searchInput.addEventListener('input', renderTable);
    filterStatus.addEventListener('change', renderTable);

    // Cargar inicial
    loadPsychologists();
  </script>
</body>
</html>
  `);
});
