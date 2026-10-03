import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../api/studentAPI';

export default function HelpSupport() {
  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Contact Form State
  const [formData, setFormData] = useState({
    subject: '',
    category: 'General Inquiry',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Tickets History State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Fetch Support Tickets from Backend API
  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await studentAPI.getMyTickets();
      if (response.data && Array.isArray(response.data)) {
        setTickets(
          response.data.map((item) => ({
            id: item._id,
            subject: item.subject,
            category: item.category,
            status: item.status || 'Open',
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent',
            response: item.adminResponse || null,
          }))
        );
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Toggle FAQ Accordion
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Handle Contact Form Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit Support Ticket to Backend API
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      await studentAPI.createTicket(formData);
      setSubmitSuccess(true);
      setFormData({
        subject: '',
        category: 'General Inquiry',
        message: '',
      });
      fetchTickets(); // Refresh ticket history
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: 'How do I reset my account password?',
      answer: 'Go to the Login page, click on "Forgot Password", and follow the instructions sent to your registered email address to reset it.',
    },
    {
      question: 'Where can I check my attendance and course progress?',
      answer: 'You can view your complete academic attendance, enrolled course progress, and grades directly from your Dashboard overview.',
    },
    {
      question: 'How do I submit my weekly assignments?',
      answer: 'Navigate to the Assignments section from the sidebar, select the active assignment task, and click on "Upload Solution" to submit your work before the deadline.',
    },
    {
      question: 'Who should I contact if I find an error in my scores?',
      answer: 'If you spot any discrepancies in your grades or submissions, raise a support ticket below selecting the "Grade Inquiry" category.',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn relative max-w-5xl mx-auto pb-10">
      
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Help & Support</h2>
        <p className="text-xs text-slate-500 mt-1">Find answers to common questions or reach out to faculty and admin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: FAQ & Contact Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* FAQs Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">
              Frequently Asked Questions
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-slate-100 rounded-2xl overflow-hidden transition"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 text-left font-bold text-xs text-slate-700 flex justify-between items-center transition"
                  >
                    <span>{faq.question}</span>
                    <span className="text-slate-400 text-sm font-normal">
                      {openFaqIndex === index ? '−' : '+'}
                    </span>
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-4 py-3 bg-white text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">
              Submit a Support Ticket
            </h3>

            {submitSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold">
                ✓ Your support ticket has been submitted successfully! Our team will respond shortly.
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="e.g. Issue with Assignment submission link"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Grade Inquiry">Grade Inquiry</option>
                  <option value="Account & Login">Account & Login</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Message Description</label>
                <textarea
                  name="message"
                  rows="4"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Describe your issue or question in detail..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Ticket...' : 'Send Support Request'}
              </button>

            </form>
          </div>

        </div>

        {/* Right Column: Ticket History & Quick Contact */}
        <div className="space-y-6">
          
          {/* My Tickets History */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">
              My Support Tickets
            </h3>

            {loadingTickets ? (
              <div className="py-8 text-center text-slate-400 font-bold text-xs">
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-2xl">🎫</div>
                <p className="text-xs font-bold text-slate-600">No active tickets found.</p>
                <p className="text-[11px] text-slate-400">Submit a form if you need help.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{ticket.subject}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex-shrink-0 ${
                        ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                        ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                      <span>{ticket.category}</span>
                      <span>{ticket.date}</span>
                    </div>

                    {ticket.response && (
                      <div className="mt-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 font-medium space-y-1">
                        <span className="font-bold text-indigo-700">Admin Response:</span>
                        <p>{ticket.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Direct Contacts */}
          <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl shadow-indigo-200/50 space-y-4">
            <h3 className="font-bold text-base">Direct Assistance</h3>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed">
              For urgent academic queries or technical emergency, reach out directly to the administration office.
            </p>
            <div className="space-y-2 text-xs font-bold pt-2 border-t border-indigo-500/50">
              <p className="flex items-center gap-2">📧 admin@studentportal.edu</p>
              <p className="flex items-center gap-2">📞 +1 (555) 382-9011</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}