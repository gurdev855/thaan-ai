import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { PRICING_PLANS } from '../config/grading';
import { getHistory } from '../utils/history';
import { Zap, Check, ArrowRight, TrendingDown } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigate } = useContext(AppContext);
  const [historyCount, setHistoryCount] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Calculator states
  const [rolls, setRolls] = useState(200);
  const [minutesPerRoll, setMinutesPerRoll] = useState(15);
  const [wage, setWage] = useState(150);
  const [disputes, setDisputes] = useState(4);
  const [disputeCost, setDisputeCost] = useState(50000);

  useEffect(() => {
    const hist = getHistory();
    setHistoryCount(hist.length);
  }, []);

  const hoursSaved = (rolls * minutesPerRoll / 60) * 0.8;
  const moneySaved = hoursSaved * wage + disputes * disputeCost * 0.6;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'var(--forest)' }}>
      {/* HERO */}
      <section className="woven-texture" style={{ backgroundColor: 'var(--forest)', color: 'var(--champagne)', padding: '100px 24px 80px', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 className="fade-up" style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 800, margin: '0 0 24px 0', lineHeight: 1.1 }}>
            The grade both sides can trust.
          </h1>
          <p className="fade-up" style={{ fontFamily: 'Spectral, serif', fontSize: '1.25rem', color: 'var(--champagne-dim)', margin: '0 auto 40px', maxWidth: '600px', lineHeight: 1.5, animationDelay: '0.1s' }}>
            Automated, objective fabric grading based on ASTM D5430 standards. 
            Reduce disputes and increase throughput with AI.
          </p>
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', animationDelay: '0.2s' }}>
            <button 
              className="btn-primary" 
              onClick={() => navigate('grade')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.125rem', padding: '16px 32px' }}
            >
              Grade a Sample <ArrowRight size={20} />
            </button>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', color: 'var(--pass)' }}>
              <span style={{ fontWeight: 700 }}>{historyCount}</span> gradings completed
            </div>
          </div>
          
          <div className="card-dark fade-up" style={{ marginTop: '64px', maxWidth: '400px', margin: '64px auto 0', padding: '24px', animationDelay: '0.3s' }}>
            <p style={{ margin: '0 0 8px 0', fontFamily: 'Unbounded, sans-serif', fontWeight: 600, fontSize: '1.125rem' }}>
              ~70% defect detection rate
            </p>
            <p style={{ margin: 0, fontFamily: 'Spectral, serif', fontStyle: 'italic', color: 'var(--champagne-dim)', fontSize: '0.875rem' }}>
              (Industry benchmark for manual inspection, ATIRA 2023)
            </p>
          </div>
        </div>
      </section>

      {/* STATS ROW */}
      <section style={{ backgroundColor: 'var(--champagne)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Stat 1 */}
            <div className="card-on-light" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>
                ~10 yd/min
              </div>
              <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '8px' }}>
                Manual inspection speed
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-dim)' }}>
                Slow and prone to fatigue.
              </div>
            </div>
            
            {/* Stat 2 */}
            <div className="card-on-light" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--reject)', marginBottom: '8px' }}>
                ₹25K–2L
              </div>
              <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '8px' }}>
                Average dispute cost
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-dim)' }}>
                Per incident of poor grading.
              </div>
            </div>
            
            {/* Stat 3 */}
            <div className="card-on-light" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--pass)', marginBottom: '8px' }}>
                &lt; 10 sec
              </div>
              <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '8px' }}>
                AI grading time
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-dim)' }}>
                Instant, objective results.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ backgroundColor: 'var(--forest)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="section-label-light" style={{ textAlign: 'center', marginBottom: '48px' }}>How It Works</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {/* Step 1 */}
            <div className="card-dark" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '10px', fontFamily: 'Unbounded, sans-serif', fontWeight: 800, fontSize: '6rem', color: 'var(--forest-3)', opacity: 0.5, zIndex: 0 }}>
                1
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.5rem', color: 'var(--champagne)', margin: '0 0 16px 0' }}>Upload</h3>
                <p style={{ fontFamily: 'Spectral, serif', color: 'var(--champagne-dim)', margin: 0, fontSize: '1.125rem' }}>
                  Capture or upload a high-resolution photo of the fabric defect or roll segment.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="card-dark" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '10px', fontFamily: 'Unbounded, sans-serif', fontWeight: 800, fontSize: '6rem', color: 'var(--forest-3)', opacity: 0.5, zIndex: 0 }}>
                2
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.5rem', color: 'var(--champagne)', margin: '0 0 16px 0' }}>Detect</h3>
                <p style={{ fontFamily: 'Spectral, serif', color: 'var(--champagne-dim)', margin: 0, fontSize: '1.125rem' }}>
                  AI automatically detects, classifies, and measures the severity of the defect with confidence scores.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="card-dark" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '10px', fontFamily: 'Unbounded, sans-serif', fontWeight: 800, fontSize: '6rem', color: 'var(--forest-3)', opacity: 0.5, zIndex: 0 }}>
                3
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.5rem', color: 'var(--champagne)', margin: '0 0 16px 0' }}>Score</h3>
                <p style={{ fontFamily: 'Spectral, serif', color: 'var(--champagne-dim)', margin: 0, fontSize: '1.125rem' }}>
                  Code translates detections into objective ASTM D5430 points. Same input, same grade every time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT CALCULATOR */}
      <section style={{ backgroundColor: 'var(--champagne)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 className="section-label" style={{ textAlign: 'center', marginBottom: '16px' }}>Impact Calculator</h2>
          <p style={{ textAlign: 'center', fontFamily: 'Spectral, serif', color: 'var(--ink-dim)', marginBottom: '48px', fontSize: '1.125rem' }}>
            Estimate your monthly savings with automated grading.
          </p>

          <div className="card-on-light" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px', backgroundColor: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Rolls/month</label>
                <input 
                  type="number" 
                  value={rolls} 
                  onChange={(e) => setRolls(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Mins/roll inspection</label>
                <input 
                  type="number" 
                  value={minutesPerRoll} 
                  onChange={(e) => setMinutesPerRoll(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Wage (₹/hr)</label>
                <input 
                  type="number" 
                  value={wage} 
                  onChange={(e) => setWage(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Disputes/month</label>
                <input 
                  type="number" 
                  value={disputes} 
                  onChange={(e) => setDisputes(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Avg dispute cost (₹)</label>
                <input 
                  type="number" 
                  value={disputeCost} 
                  onChange={(e) => setDisputeCost(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', borderTop: '1px solid #eee', paddingTop: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(126, 217, 160, 0.2)', padding: '16px', borderRadius: '50%' }}>
                  <Zap size={32} color="var(--forest)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Spectral, serif', color: 'var(--ink-dim)', marginBottom: '4px' }}>Hours Saved / mo</div>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--forest)' }}>
                    {hoursSaved.toFixed(0)} <span style={{ fontSize: '1rem', fontWeight: 400 }}>hrs</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(126, 217, 160, 0.2)', padding: '16px', borderRadius: '50%' }}>
                  <TrendingDown size={32} color="var(--forest)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Spectral, serif', color: 'var(--ink-dim)', marginBottom: '4px' }}>Money Saved / mo</div>
                  <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--forest)' }}>
                    {formatCurrency(moneySaved)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ backgroundColor: 'var(--forest)', padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="section-label-light" style={{ textAlign: 'center', marginBottom: '24px' }}>Pricing</h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', backgroundColor: 'var(--forest-3)', borderRadius: '24px', padding: '4px' }}>
              <button 
                onClick={() => setBillingCycle('monthly')}
                style={{ 
                  padding: '8px 24px', 
                  borderRadius: '20px', 
                  border: 'none', 
                  backgroundColor: billingCycle === 'monthly' ? 'var(--champagne)' : 'transparent',
                  color: billingCycle === 'monthly' ? 'var(--forest)' : 'var(--champagne-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('annual')}
                style={{ 
                  padding: '8px 24px', 
                  borderRadius: '20px', 
                  border: 'none', 
                  backgroundColor: billingCycle === 'annual' ? 'var(--champagne)' : 'transparent',
                  color: billingCycle === 'annual' ? 'var(--forest)' : 'var(--champagne-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Annual (Save 20%)
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
            {PRICING_PLANS.map((plan) => {
              const isHighlighted = plan.highlight;
              const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
              const isEnterprise = plan.priceMonthly === 0;

              return (
                <div 
                  key={plan.name} 
                  className={isHighlighted ? "card-light" : "card-dark"} 
                  style={{ 
                    padding: '32px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    backgroundColor: isHighlighted ? 'var(--champagne)' : 'var(--forest-2)',
                    color: isHighlighted ? 'var(--ink)' : 'var(--champagne)',
                    border: isHighlighted ? 'none' : '1px solid var(--forest-3)',
                    transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isHighlighted ? 2 : 1,
                  }}
                >
                  <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '1.25rem', marginBottom: '8px' }}>
                    {plan.name}
                  </h3>
                  
                  <div style={{ margin: '24px 0', minHeight: '60px' }}>
                    {isEnterprise ? (
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '2rem', fontWeight: 800 }}>
                        Custom pricing
                      </span>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '3rem', fontWeight: 800 }}>
                          ₹{price.toLocaleString()}
                        </span>
                        <span style={{ color: isHighlighted ? 'var(--ink-dim)' : 'var(--champagne-dim)' }}>
                          /{billingCycle === 'monthly' ? 'mo' : 'mo billed annually'}
                        </span>
                      </>
                    )}
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flexGrow: 1 }}>
                    {plan.features.map((feature, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', fontFamily: 'Spectral, serif', fontSize: '1.125rem' }}>
                        <Check size={20} color={isHighlighted ? 'var(--forest)' : 'var(--pass)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button 
                    className={isHighlighted ? 'btn-forest' : 'btn-primary'}
                    onClick={() => navigate('grade')}
                    style={{ width: '100%', padding: '16px', fontSize: '1.125rem', fontWeight: 600 }}
                  >
                    {isEnterprise ? 'Contact Sales' : 'Get Started'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: 'var(--forest)', borderTop: '1px solid var(--forest-3)', padding: '64px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '48px' }}>
          <div>
            <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--champagne)', marginBottom: '8px' }}>
              thaan.ai
            </div>
            <p style={{ fontFamily: 'Spectral, serif', color: 'var(--champagne-dim)', margin: '0 0 16px 0' }}>
              The grade both sides can trust.
            </p>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--pass)', fontSize: '0.875rem' }}>
              @thaan_ai
            </div>
          </div>

          <div style={{ display: 'flex', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => navigate('landing')} style={{ background: 'none', border: 'none', color: 'var(--champagne-dim)', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Home</button>
              <button onClick={() => navigate('grade')} style={{ background: 'none', border: 'none', color: 'var(--champagne-dim)', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Grade</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => navigate('compare')} style={{ background: 'none', border: 'none', color: 'var(--champagne-dim)', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Before vs After</button>
              <button onClick={() => navigate('verify')} style={{ background: 'none', border: 'none', color: 'var(--champagne-dim)', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Verify</button>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '48px auto 0', borderTop: '1px solid var(--forest-3)', paddingTop: '24px', textAlign: 'center', color: 'var(--forest-3)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>
          © 2024 Thaan Technologies Pvt. Ltd.
        </div>
      </footer>
    </div>
  );
};
