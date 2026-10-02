import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Printer,
  Mail,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { Invoice, Appointment } from '../types';

interface InvoicesViewProps {
  onOpenInvoice: (invoiceId: string) => void;
  onInvoiceCreated: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onOpenInvoice,
  onInvoiceCreated,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // New Invoice Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('Honorarios profesionales por atención psicoterapéutica.');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const [invList, aptList] = await Promise.all([
        api.getInvoices(),
        api.getAppointments({ status: 'realizada' }),
      ]);
      setInvoices(invList);
      // Filter appointments that don't have an invoice yet
      const unbilled = aptList.filter((a) => !a.invoice_id);
      setCompletedAppointments(unbilled);
      if (unbilled.length > 0 && !selectedAppointmentId) {
        setSelectedAppointmentId(unbilled[0].id);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentId) {
      setError('Selecciona una cita realizada.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await api.createInvoiceFromAppointment(selectedAppointmentId, {
        taxRate: Number(taxRate) || 0,
        notes,
        paymentMethod,
      });
      setShowNewModal(false);
      loadInvoices();
      onInvoiceCreated();
      onOpenInvoice(res.id);
    } catch (err: any) {
      setError(err.message || 'Error al generar la factura.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Facturación & Comprobantes</h1>
          <p className="text-xs text-slate-500">
            Generación de facturas simples para citas realizadas, exportación en PDF y envío por Google SMTP
          </p>
        </div>
        <button
          onClick={() => {
            setShowNewModal(true);
            setError(null);
          }}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generar Factura Simple</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando facturas...</div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">No hay facturas emitidas todavía</p>
            <p className="text-xs text-slate-400">
              Genera tu primer comprobante a partir de una cita clínica realizada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Nº Comprobante</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Terapeuta</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4 text-right">Importe Total</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Envío Email</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onOpenInvoice(inv.id)}
                        className="font-mono font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{inv.patient_name}</span>
                      <span className="text-[11px] font-mono text-slate-400">{inv.patient_document}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{inv.therapist_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${Number(inv.total_amount).toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded font-mono ${
                          inv.payment_status === 'pagada'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.payment_status === 'anulada'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.sent_via_email ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enviado</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">No enviado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenInvoice(inv.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Ver / PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW INVOICE MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold">Generar Factura Simple</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccionar Cita Realizada *
                </label>
                {completedAppointments.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200">
                    No hay citas realizadas pendientes de facturación. Todas las citas completadas ya tienen factura generada o no hay citas finalizadas.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedAppointmentId}
                    onChange={(e) => setSelectedAppointmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    {completedAppointments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.appointment_date} · {apt.patient_name} (${apt.agreed_fee}) - Terapeuta: {apt.therapist_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Impuesto / IVA (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta Débito/Crédito</option>
                    <option value="bizum">Bizum / Depósito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || completedAppointments.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Generando...' : 'Crear Factura & Ver PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
