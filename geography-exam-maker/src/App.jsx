import { useState, useEffect } from 'react'
import { initialQuestions } from './data/initialQuestions'
import { SYLLABUS } from './data/syllabus'

function App() {
  const [step, setStep] = useState(1) // 1: Settings, 2: Select, 3: Print
  // const [questions, setQuestions] = useState(initialQuestions) // Removed in favor of LS version

  const [view, setView] = useState('exam') // 'exam' or 'manage'

  // Initialize questions from LocalStorage or default
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('geo_questions')
    return saved ? JSON.parse(saved) : initialQuestions
  })

  // Save to LS whenever questions change
  useEffect(() => {
    localStorage.setItem('geo_questions', JSON.stringify(questions))
  }, [questions])

  // Config State for Exam Wizard
  const [config, setConfig] = useState({
    grade: 1,
    semester: 1,
    examType: 'monthly', // daily or monthly
    selectedChapters: [], // ['ch1', 'ch2']
    choiceCount: 5,
    textCount: 2
  })

  const [selectedIds, setSelectedIds] = useState([])
  const [filteredPool, setFilteredPool] = useState([])

  // Helper: Get available chapters based on grade/semester
  const getChapters = (g, s) => SYLLABUS[g]?.semesters[s]?.chapters || []
  const currentChapters = getChapters(config.grade, config.semester)

  // Step 1 -> 2: Apply Filters & Auto-select
  const handleConfigSubmit = (e) => {
    e.preventDefault()

    // Filter questions based on config
    const pool = questions.filter(q => {
      if (q.grade !== parseInt(config.grade)) return false
      // Loose comparison for semester to support legacy data if any
      if (q.semester && q.semester !== parseInt(config.semester)) return false

      if (config.selectedChapters.length > 0 && !config.selectedChapters.includes(q.chapter)) return false

      if (config.examType !== 'all' && q.examType !== config.examType) {
        return false
      }
      return true
    })

    setFilteredPool(pool)

    // Auto-select logic
    const choiceQs = pool.filter(q => q.qType === 'choice')
    const textQs = pool.filter(q => q.qType === 'text')

    const shuffledChoice = [...choiceQs].sort(() => 0.5 - Math.random()).slice(0, config.choiceCount)
    const shuffledText = [...textQs].sort(() => 0.5 - Math.random()).slice(0, config.textCount)

    const autoSelected = [...shuffledChoice, ...shuffledText].map(q => q.id)
    setSelectedIds(autoSelected)

    setStep(2)
  }

  const toggleChapter = (chId) => {
    setConfig(prev => {
      const newChs = prev.selectedChapters.includes(chId)
        ? prev.selectedChapters.filter(c => c !== chId)
        : [...prev.selectedChapters, chId]
      return { ...prev, selectedChapters: newChs }
    })
  }

  const toggleQuestionSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    )
  }

  // --- Manager State & Logic ---
  const [manageForm, setManageForm] = useState({
    grade: 1,
    semester: 1,
    chapter: '',
    examType: 'daily',
    qType: 'choice',
    question: '',
    options: ['', '', '', ''],
    answer: ''
  })

  // Reset chapter when grade/sem changes
  useEffect(() => {
    const chapters = getChapters(manageForm.grade, manageForm.semester)
    if (chapters.length > 0 && !chapters.find(c => c.id === manageForm.chapter)) {
      setManageForm(prev => ({ ...prev, chapter: chapters[0].id }))
    }
  }, [manageForm.grade, manageForm.semester])

  const handleDeleteQuestion = (id) => {
    if (window.confirm('確定要刪除此題目嗎？')) {
      setQuestions(prev => prev.filter(q => q.id !== id))
    }
  }

  const handleManagerSubmit = (e) => {
    e.preventDefault()
    const newQ = {
      id: Date.now().toString(),
      grade: parseInt(manageForm.grade),
      semester: parseInt(manageForm.semester),
      chapter: manageForm.chapter,
      examType: manageForm.examType,
      qType: manageForm.qType,
      question: manageForm.question,
      options: manageForm.qType === 'choice' ? manageForm.options : [],
      answer: manageForm.answer
    }
    setQuestions([newQ, ...questions])
    alert('新增成功！')
    // Reset text fields but keep context
    setManageForm(prev => ({
      ...prev,
      question: '',
      options: ['', '', '', ''],
      answer: ''
    }))
  }

  // --- Views ---

  // Manager View
  const renderManager = () => {
    const mgrChapters = getChapters(manageForm.grade, manageForm.semester)
    return (
      <div className="container" style={{ maxWidth: '1000px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left: Add Form */}
          <div className="card sticky-form" style={{ position: 'sticky', top: '2rem' }}>
            <h3 style={{ color: 'var(--primary)', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>➕ 新增試題</h3>
            <form onSubmit={handleManagerSubmit}>
              {/* Metadata Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label>年級</label>
                  <select value={manageForm.grade} onChange={e => setManageForm({ ...manageForm, grade: parseInt(e.target.value) })}>
                    <option value={1}>一年級</option>
                    <option value={2}>二年級</option>
                    <option value={3}>三年級</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>學期</label>
                  <select value={manageForm.semester} onChange={e => setManageForm({ ...manageForm, semester: parseInt(e.target.value) })}>
                    <option value={1}>上學期</option>
                    <option value={2}>下學期</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>章節</label>
                <select value={manageForm.chapter} onChange={e => setManageForm({ ...manageForm, chapter: e.target.value })}>
                  {mgrChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label>類型</label>
                  <select value={manageForm.examType} onChange={e => setManageForm({ ...manageForm, examType: e.target.value })}>
                    <option value="daily">平時考</option>
                    <option value="monthly">段考</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>題型</label>
                  <select value={manageForm.qType} onChange={e => setManageForm({ ...manageForm, qType: e.target.value })}>
                    <option value="choice">選擇題</option>
                    <option value="text">簡答題</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>題目內容</label>
                <textarea required rows="4" value={manageForm.question} onChange={e => setManageForm({ ...manageForm, question: e.target.value })} placeholder="請輸入題目..."></textarea>
              </div>

              {manageForm.qType === 'choice' && (
                <div className="form-group">
                  <label>選項 (A, B, C, D)</label>
                  {manageForm.options.map((opt, idx) => (
                    <input
                      key={idx}
                      style={{ marginBottom: '0.25rem' }}
                      placeholder={String.fromCharCode(65 + idx)}
                      required
                      value={opt}
                      onChange={e => {
                        const newOpts = [...manageForm.options]
                        newOpts[idx] = e.target.value
                        setManageForm({ ...manageForm, options: newOpts })
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="form-group">
                <label>答案 Correct Answer</label>
                <input required value={manageForm.answer} onChange={e => setManageForm({ ...manageForm, answer: e.target.value })} placeholder="例如: A 或 簡答文字" />
              </div>

              <button type="submit" className="btn btn-primary btn-block">儲存題目</button>
            </form>
          </div>

          {/* Right: List */}
          <div className="card">
            <h3 style={{ color: 'var(--secondary)', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}> 題庫列表 ({questions.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>分類</th>
                    <th style={{ padding: '0.5rem' }}>題目</th>
                    <th style={{ padding: '0.5rem', width: '60px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div className="badge">{q.grade}年-{q.semester === 1 ? '上' : '下'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{q.chapter}</div>
                        <div className={`badge ${q.qType}`} style={{ marginTop: '0.2rem' }}>{q.qType === 'choice' ? '選' : '簡'}</div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: '500' }}>{q.question}</div>
                        <div style={{ fontSize: '0.85rem', color: 'green' }}>Ans: {q.answer}</div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                        >刪</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Exam Configuration
  const renderStep1 = () => (
    <div className="card settings-card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
        第一步：設定出題範圍與規則
      </h2>
      <form onSubmit={handleConfigSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left: Scope */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--secondary)' }}>1. 選擇範圍</h3>
            <div className="form-group">
              <label>年級</label>
              <select value={config.grade} onChange={e => setConfig({ ...config, grade: parseInt(e.target.value) })}>
                <option value={1}>一年級 (台灣)</option>
                <option value={2}>二年級 (中國)</option>
                <option value={3}>三年級 (世界)</option>
              </select>
            </div>
            <div className="form-group">
              <label>學期</label>
              <select value={config.semester} onChange={e => setConfig({ ...config, semester: parseInt(e.target.value) })}>
                <option value={1}>上學期</option>
                <option value={2}>下學期</option>
              </select>
            </div>
            <div className="form-group">
              <label>章節 (可複選)</label>
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                {currentChapters.length === 0 && <div style={{ color: '#999' }}>無章節資料</div>}
                {currentChapters.map(ch => (
                  <label key={ch.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.selectedChapters.includes(ch.id)}
                      onChange={() => toggleChapter(ch.id)}
                    />
                    {ch.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Type & Quotas */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--secondary)' }}>2. 考試設定</h3>
            <div className="form-group">
              <label>考試類型</label>
              <select value={config.examType} onChange={e => setConfig({ ...config, examType: e.target.value })}>
                <option value="daily">平時考</option>
                <option value="monthly">段考 (月考)</option>
              </select>
            </div>

            <div className="form-group">
              <label>預計題數</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>選擇題數量</span>
                  <input type="number" min="0" value={config.choiceCount} onChange={e => setConfig({ ...config, choiceCount: parseInt(e.target.value) })} />
                </div>
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>簡答題數量</span>
                  <input type="number" min="0" value={config.textCount} onChange={e => setConfig({ ...config, textCount: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          <button className="btn btn-primary" type="submit" disabled={config.selectedChapters.length === 0}>
            下一步：挑選題目 &rarr;
          </button>
        </div>
      </form>
    </div>
  )

  // Step 2: Selection
  const renderStep2 = () => (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)' }}>第二步：勾選確認題目</h2>
          <p style={{ color: 'var(--secondary)' }}>
            系統已根據您的設定，從 {filteredPool.length} 題中挑選了 {selectedIds.length} 題。您可以手動調整。
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setStep(1)}>上一步</button>
          <button className="btn btn-primary" onClick={() => setStep(3)}>下一步：預覽列印 &rarr;</button>
        </div>
      </div>

      <div className="question-pool card">
        {filteredPool.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>在此範圍內找不到題目，請嘗試選擇其他章節。</div>
        ) : (
          filteredPool.map(q => (
            <div key={q.id} className={`question-item ${selectedIds.includes(q.id) ? 'selected-item' : ''}`} style={{ background: selectedIds.includes(q.id) ? '#f0f9ff' : 'white' }}>
              <input
                type="checkbox"
                className="question-checkbox"
                checked={selectedIds.includes(q.id)}
                onChange={() => toggleQuestionSelection(q.id)}
              />
              <div className="question-content">
                <div className="question-meta">
                  <span className="badge">{SYLLABUS[q.grade]?.semesters[q.semester]?.chapters.find(c => c.id === q.chapter)?.name || q.chapter}</span>
                  <span className={`badge ${q.qType}`}>{q.qType === 'choice' ? '選擇' : '簡答'}</span>
                </div>
                <div className="question-text">{q.question}</div>
                {q.qType === 'choice' && (
                  <div className="question-options">
                    {q.options.map((opt, i) => (
                      <div key={i}>({String.fromCharCode(65 + i)}) {opt}</div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '0.4rem', color: 'green', fontSize: '0.85rem' }}>Ans: {q.answer}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // Step 3: Print Preview
  const renderStep3 = () => {
    const questionsToPrint = questions.filter(q => selectedIds.includes(q.id))
    const choiceQs = questionsToPrint.filter(q => q.qType === 'choice')
    const textQs = questionsToPrint.filter(q => q.qType === 'text')

    return (
      <div className="print-preview">
        <div className="print-controls no-print" style={{ padding: '1rem', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <span>總計：{questionsToPrint.length} 題 (選擇 {choiceQs.length} / 簡答 {textQs.length})</span>
          <div>
            <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ marginRight: '1rem' }}>&larr; 返回修改</button>
            <button className="btn btn-primary" onClick={() => window.print()}>🖨️ 列印考卷</button>
          </div>
        </div>

        <div className="paper-size" style={{ padding: '2cm', maxWidth: '210mm', margin: '2rem auto', background: 'white', minHeight: '297mm', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          <div className="print-header">
            <h2 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '0.5rem' }}>
              {SYLLABUS[config.grade].label} {config.examType === 'monthly' ? '段考' : '平時測驗'}
            </h2>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1rem' }}>
              範圍：{config.selectedChapters.map(cid => currentChapters.find(c => c.id === cid)?.name).join('、')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
              <span>班級：__________</span>
              <span>姓名：__________</span>
              <span>座號：______</span>
              <span>得分：__________</span>
            </div>
          </div>

          <div className="print-body">
            {choiceQs.length > 0 && (
              <div className="section">
                <h3 style={{ borderLeft: '5px solid #666', paddingLeft: '0.5rem', margin: '1rem 0' }}>一、選擇題</h3>
                {choiceQs.map((q, idx) => (
                  <div key={q.id} className="print-question" style={{ marginBottom: '1.5rem' }}>
                    <div className="print-question-text">{idx + 1}. {q.question}</div>
                    <div className="print-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingLeft: '1rem' }}>
                      {q.options.map((opt, i) => (
                        <div key={i} style={{ minWidth: '150px' }}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {textQs.length > 0 && (
              <div className="section" style={{ marginTop: '2rem' }}>
                <h3 style={{ borderLeft: '5px solid #666', paddingLeft: '0.5rem', margin: '1rem 0' }}>二、簡答題</h3>
                {textQs.map((q, idx) => (
                  <div key={q.id} className="print-question" style={{ marginBottom: '3rem' }}>
                    <div className="print-question-text">{idx + 1}. {q.question}</div>
                    <div style={{ height: '80px', borderBottom: '1px solid #ccc', marginTop: '1rem' }}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="print-footer no-print" style={{ marginTop: '5rem', borderTop: '1px dashed #ccc', paddingTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
            <p>參考答案 (教師用)：</p>
            <p>選擇題： {choiceQs.map((q, i) => `${i + 1}.${q.answer}`).join('  |  ')}</p>
            <p>簡答題： {textQs.map((q, i) => `${i + 1}.${q.answer}`).join('  |  ')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {step !== 3 && (
        <header>
          <div className="header-inner" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <h1>🌏 國中地理出題系統</h1>
              <nav style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className={`btn ${view === 'exam' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setView('exam')}
                >📝 製作考卷</button>
                <button
                  className={`btn ${view === 'manage' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setView('manage')}
                >📂 題庫管理</button>
              </nav>
            </div>
          </div>
        </header>
      )}

      {view === 'exam' && (
        <>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </>
      )}

      {view === 'manage' && renderManager()}

    </div>
  )
}

export default App
