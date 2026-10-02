import React, { useState, useEffect } from 'react';
import { X, Printer, Mail, CheckCircle2, AlertCircle, Receipt, Download, Calendar, User, CreditCard } from 'lucide-react';
import { api } from '../api/client';
import { Invoice } from '../types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  invoiceId: string;
  onClose: () => void;
  onInvoiceUpdated: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  invoiceId,
  onClose,
  onInvoiceUpdated,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadInvoice();
    }
  }, [isOpen, invoiceId]);

  const loadInvoice = async () => {
    setLoading(true);
    setEmailStatus(null);
    try {
      const data = await api.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error('Error loading invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await api.sendInvoiceEmail(invoice.id);
      setEmailStatus({
        success: res.sent,
        message: res.message,
      });
      if (res.sent) {
        onInvoiceUpdated();
        loadInvoice();
      }
    } catch (err: any) {
      setEmailStatus({
        success: false,
        message: err.message || 'Error al conectar con Google SMTP.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusChange = async (newStatus: 'pendiente' | 'pagada' | 'anulada') => {
    if (!invoice) return;
    try {
      await api.updateInvoiceStatus(invoice.id, newStatus);
      setInvoice({ ...invoice, payment_status: newStatus });
      onInvoiceUpdated();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Controls Header (hidden in print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Comprobante de Honorarios</h3>
              <p className="text-xs text-slate-400">Nº Factura: {invoice?.invoice_number || 'Cargando...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Exportar PDF</span>
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !invoice?.patient_email}
              type="button"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{sendingEmail ? 'Enviando...' : 'Enviar por Email'}</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Email feedback notice */}
        {emailStatus && (
          <div
            className={`no-print px-5 py-2 text-xs flex items-center gap-2 ${
              emailStatus.success
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-b border-amber-200'
            }`}
          >
            {emailStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{emailStatus.message}</span>
          </div>
        )}

        {/* PRINTABLE INVOICE AREA */}
        <div id="printable-invoice" className="flex-1 overflow-y-auto p-8 bg-white text-slate-900">
          {loading || !invoice ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando datos de facturación...</div>
          ) : (
            <div className="space-y-6">
              {/* Invoice Clinic Top Bar */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    CONSULTORIO DE PSICOLOGÍA CLÍNICA
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">Atención Profesional & Salud Mental</p>
                  <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                    <p>Profesional: <strong>{invoice.therapist_name}</strong></p>
                    <p>Colegiatura / Licencia: <strong>{invoice.therapist_license || 'Col. Oficial'}</strong></p>
                    {invoice.therapist_email && <p>Email: {invoice.therapist_email}</p>}
                    {invoice.therapist_phone && <p>Teléfono: {invoice.therapist_phone}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Factura Electrónica
                  </span>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {invoice.invoice_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    <p>Fecha de Emisión: <strong>{invoice.issue_date}</strong></p>
                    <p>Vencimiento: <strong>{invoice.due_date}</strong></p>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-semibold rounded uppercase font-mono ${
                        invoice.payment_status === 'pagada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : invoice.payment_status === 'anulada'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {invoice.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Client Details */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Datos del Paciente
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{invoice.patient_name}</p>
                  <p className="text-slate-600 mt-0.5">Documento / DNI: <span className="font-mono">{invoice.patient_document}</span></p>
                  {invoice.patient_email && <p className="text-slate-600">Email: {invoice.patient_email}</p>}
                  {invoice.patient_phone && <p className="text-slate-600">Tel: {invoice.patient_phone}</p>}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Detalles de la Consulta
                  </span>
                  <p className="text-slate-700">Fecha de Atención: <strong>{invoice.appointment_date || invoice.issue_date}</strong></p>
                  <p className="text-slate-700">Horario: <strong>{invoice.start_time || 'N/A'} - {invoice.end_time || 'N/A'}</strong></p>
                  <p className="text-slate-700 capitalize">Modalidad: <strong>{invoice.session_type || 'Individual'}</strong></p>
                  <p className="text-slate-700 capitalize">Método de Pago: <strong>{invoice.payment_method}</strong></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3 text-left">Descripción del Servicio</th>
                    <th className="py-2.5 px-3 text-center">Cant.</th>
                    <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">Sesión de Psicoterapia Clínica</p>
                      <p className="text-[11px] text-slate-500">
                        Atención personalizada por profesional colegiado. Consulta de 50 minutos.
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">1</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {Number(invoice.session_cost).toFixed(2)} {invoice.currency}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                      {Number(invoice.session_cost).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}></td>
                    <td className="py-2 px-3 text-right text-slate-600">Subtotal:</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {Number(invoice.session_cost).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                  {Number(invoice.tax_rate) > 0 && (
                    <tr>
                      <td colSpan={2}></td>
                      <td className="py-1 px-3 text-right text-slate-600">Impuestos ({invoice.tax_rate}%):</td>
                      <td className="py-1 px-3 text-right font-mono tabular-nums">
                        {Number(invoice.tax_amount).toFixed(2)} {invoice.currency}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                    <td colSpan={2}></td>
                    <td className="py-3 px-3 text-right">TOTAL A PAGAR:</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-base">
                      {Number(invoice.total_amount).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Notes */}
              {invoice.notes && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block mb-0.5">Observaciones:</span>
                  <p className="text-slate-600">{invoice.notes}</p>
                </div>
              )}

              {/* Legal Notice */}
              <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-4 space-y-0.5">
                <p>Comprobante válido para fines fiscales y reintegros con seguros de salud.</p>
                <p>PsicoGestión · Plataforma de Gestión Clínica Psicológica</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Payment Status Switcher (hidden in print) */}
        {invoice && (
          <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Cambiar Estado de Pago:</span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {(['pendiente', 'pagada', 'anulada'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded uppercase transition-colors cursor-pointer ${
                      invoice.payment_status === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-slate-500 text-[11px]">
              {invoice.sent_via_email ? (
                <span className="text-emerald-700 font-medium">✓ Enviada al paciente por correo</span>
              ) : (
                <span>No enviada por email aún</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
