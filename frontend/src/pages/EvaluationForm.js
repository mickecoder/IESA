import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EvaluationForm = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const [setup, setSetup] = useState({ course: null, questions: [] });
    const [ratings, setRatings] = useState({});
    const [comments, setComments] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [alreadyEvaluated, setAlreadyEvaluated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [distribution, setDistribution] = useState({ total: 0, counts: {1:0,2:0,3:0,4:0,5:0}, percentages: {1:0,2:0,3:0,4:0,5:0} });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch evaluation setup and check status in parallel
                const [setupRes, checkRes, distRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/setup-eval/${courseId}`),
                    axios.get('http://localhost:5000/api/evaluations/check', {
                        params: { student_id: user.id, course_id: courseId }
                    }),
                    axios.get(`http://localhost:5000/api/courses/${courseId}/distribution`)
                ]);

                setSetup(setupRes.data);
                setAlreadyEvaluated(checkRes.data.completed);
                if (distRes && distRes.data) setDistribution(distRes.data);
            } catch (err) {
                console.error("Error loading evaluation:", err);
                alert("Failed to load evaluation form. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [courseId, user.id]);

    const handleRatingChange = (criteriaId, value) => {
        setRatings({ ...ratings, [criteriaId]: parseInt(value) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (alreadyEvaluated) {
            alert("You have already evaluated this course. Thank you!");
            return;
        }

        if (Object.keys(ratings).length < setup.questions.length) {
            alert("Please provide a rating for all criteria.");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post('http://localhost:5000/api/evaluations/submit', {
                student_id: user.id,
                instructor_id: setup.course.instructor_id,
                course_id: courseId,
                ratings: ratings,
                comments: comments
            });
            alert("Evaluation Submitted Successfully!");
            navigate('/student-home');
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data?.error || "Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Show loading spinner while fetching data (no blinking)
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading evaluation form...</p>
            </div>
        );
    }

    // If already evaluated, show message
    if (alreadyEvaluated) {
        return (
            <div style={styles.pageWrapper}>
                <div style={styles.alertCard}>
                    <div style={styles.alertIcon}>✅</div>
                    <h3>Already Evaluated</h3>
                    <p>You have already evaluated this course. Thank you for your feedback!</p>
                    <button onClick={() => navigate('/student-home')} style={styles.backBtn}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // If course not found
    if (!setup.course) {
        return (
            <div style={styles.pageWrapper}>
                <div style={styles.alertCard}>
                    <div style={styles.alertIcon}>❌</div>
                    <h3>Course Not Found</h3>
                    <p>The course you're trying to evaluate doesn't exist.</p>
                    <button onClick={() => navigate('/student-home')} style={styles.backBtn}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const progress = Object.keys(ratings).length;
    const total = setup.questions.length;
    const progressPercent = (progress / total) * 100;

    return (
        <div style={styles.pageWrapper}>
            {/* Header Section */}
            <div style={styles.headerCard}>
                <div style={styles.headerTop}>
                    <div style={styles.headerContent}>
                        <h2 style={styles.courseName}>{setup.course.course_name}</h2>
                        <div style={styles.instructorBadge}>
                            👨‍🏫 Instructor: <b>{setup.course.instructor_name || 'Not Assigned'}</b>
                        </div>
                    </div>
                    <div style={styles.ratingDistributionCard}>
                        <h3 style={styles.ratingDistributionTitle}>Rating Distribution</h3>
                        <div style={styles.distributionBox}>
                            {[
                                { r:5, label: 'Excellent', color: '#10b981' },
                                { r:4, label: 'Very Good', color: '#0ea5e9' },
                                { r:3, label: 'Good', color: '#f59e0b' },
                                { r:2, label: 'Satisfactory', color: '#84cc16' },
                                { r:1, label: 'Needs Improvement', color: '#ef4444' }
                            ].map(item => (
                                <div key={item.r} style={styles.distRow}>
                                    <div style={{...styles.distDot, backgroundColor: item.color}} />
                                    <div style={styles.distLabel}>{item.label}</div>
                                    <div style={styles.distBarWrap}>
                                        <div style={{
                                            ...styles.distBar,
                                            width: `${total > 0 ? ((distribution.counts[item.r] || 0) / Object.values(distribution.counts).reduce((sum, val) => sum + val, 0)) * 100 : 0}%`,
                                            backgroundColor: item.color
                                        }} />
                                    </div>
                                    <div style={styles.distCount}>{distribution.counts[item.r] || 0}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={styles.headerInfo}>
                    Please rate the instructor honestly based on your experience this semester.
                </div>
            </div>

            {/* Progress Bar - Shows rating progress */}
            <div style={styles.progressContainer}>
                <div style={styles.progressText}>
                    Progress: {progress} / {total} questions answered
                </div>
                <div style={styles.progressBar}>
                    <div style={{
                        ...styles.progressFill,
                        width: `${progressPercent}%`
                    }}></div>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={styles.formContainer}>
                {setup.questions.map((q, index) => (
                    <div key={q.id} style={styles.questionCard}>
                        <div style={styles.questionHeader}>
                            <span style={styles.questionNumber}>{index + 1}</span>
                            <p style={styles.questionText}>{q.question}</p>
                        </div>
                        
                        <div style={styles.ratingScale}>
                            <span style={styles.scaleLabel}>Poor</span>
                            <div style={styles.radioGroup}>
                                {[1, 2, 3, 4, 5].map(num => (
                                    <label key={num} style={styles.ratingCircle}>
                                        <input 
                                            type="radio" 
                                            name={`criteria-${q.id}`} 
                                            value={num} 
                                            style={styles.hiddenRadio}
                                            onChange={(e) => handleRatingChange(q.id, e.target.value)} 
                                        />
                                        <div style={{
                                            ...styles.circleInner,
                                            backgroundColor: ratings[q.id] === num ? '#1da1d2' : '#f2f4f7',
                                            color: ratings[q.id] === num ? '#fff' : '#475467',
                                            borderColor: ratings[q.id] === num ? '#1da1d2' : '#d0d5dd'
                                        }}>
                                            {num}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <span style={styles.scaleLabel}>Excellent</span>
                        </div>
                    </div>
                ))}

                <div style={styles.commentSection}>
                    <label style={styles.commentLabel}>Additional Comments (Optional)</label>
                    <textarea 
                        style={styles.textarea}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Share your thoughts or suggestions about the instructor..."
                        rows="4"
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button 
                        type="button" 
                        onClick={() => navigate('/student-home')}
                        style={styles.cancelBtn}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        style={{
                            ...styles.submitBtn,
                            opacity: submitting ? 0.7 : 1,
                            cursor: submitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Evaluation'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles = {
    pageWrapper: {
        maxWidth: '800px',
        margin: '40px auto',
        fontFamily: "'Inter', sans-serif",
        padding: '0 20px'
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #0ea5e9',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    headerCard: {
        background: '#1da1d2',
        color: '#fff',
        padding: '30px',
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px',
        flexWrap: 'wrap'
    },
    ratingDistributionTitleBox: {
        textAlign: 'right',
        minWidth: '200px'
    },
    ratingDistributionCard: {
        minWidth: '220px',
        maxWidth: '240px',
        background: 'rgba(255,255,255,0.14)',
        borderRadius: '14px',
        padding: '14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
    },
    ratingDistributionTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '700',
        letterSpacing: '0.2px',
        color: '#ffffff',
        marginBottom: '10px'
    },
    distributionBox: { display: 'flex', flexDirection: 'column', gap: '10px' },
    distRow: { display: 'grid', gridTemplateColumns: '12px minmax(90px, 1fr) 1fr 28px', alignItems: 'center', gap: '10px' },
    distDot: { width: '10px', height: '10px', borderRadius: '50%' },
    distLabel: { fontSize: '12px', color: '#f8fafc', whiteSpace: 'nowrap' },
    distBarWrap: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.18)', borderRadius: '999px', overflow: 'hidden' },
    distBar: { height: '100%', borderRadius: '999px' },
    distCount: { fontSize: '12px', fontWeight: '700', color: '#f8fafc', textAlign: 'right' },
    distributionContainerSimple: { marginTop: '10px', background: 'rgba(255,255,255,0.06)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' },
    catItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px 8px', background: 'transparent' },
    catLabel: { fontSize: '13px', color: '#fff', opacity: 0.95 },
    catCountLarge: { fontSize: '16px', fontWeight: '700', color: '#fff' },
    courseName: { margin: 0, fontSize: '24px', fontWeight: '700' },
    instructorBadge: {
        display: 'inline-block',
        marginTop: '10px',
        background: 'rgba(255,255,255,0.2)',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '14px'
    },
    headerInfo: { marginTop: '15px', fontSize: '14px', opacity: 0.9 },
    
    progressContainer: {
        backgroundColor: '#fff',
        padding: '15px 20px',
        borderBottom: '1px solid #e2e8f0'
    },
    progressText: {
        fontSize: '12px',
        color: '#64748b',
        marginBottom: '8px'
    },
    progressBar: {
        height: '6px',
        backgroundColor: '#e2e8f0',
        borderRadius: '3px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: '3px',
        transition: 'width 0.3s ease'
    },
    
    formContainer: {
        background: '#fff',
        padding: '30px',
        borderRadius: '0 0 12px 12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f2f4f7'
    },
    questionCard: {
        marginBottom: '35px',
        paddingBottom: '20px',
        borderBottom: '1px solid #f2f4f7'
    },
    questionHeader: { display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '20px' },
    questionNumber: {
        background: '#e0f2fe',
        color: '#0ea5e9',
        fontWeight: 'bold',
        minWidth: '28px',
        height: '28px',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '14px'
    },
    questionText: { margin: 0, fontWeight: '600', color: '#101828', fontSize: '16px', lineHeight: '1.5' },
    ratingScale: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' },
    scaleLabel: { fontSize: '12px', color: '#667085', textTransform: 'uppercase', fontWeight: '500' },
    radioGroup: { display: 'flex', gap: '10px' },
    ratingCircle: { cursor: 'pointer', display: 'inline-flex' },
    hiddenRadio: {
        position: 'absolute',
        opacity: 0,
        width: '1px',
        height: '1px',
        margin: 0,
        padding: 0,
        border: '0',
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)'
    },
    circleInner: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: '2px solid',
        fontWeight: '700',
        fontSize: '16px',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
    },
    commentSection: { marginTop: '20px' },
    commentLabel: { display: 'block', fontWeight: '600', color: '#344054', marginBottom: '8px' },
    textarea: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #d0d5dd',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical',
        marginBottom: '25px',
        outline: 'none'
    },
    buttonGroup: {
        display: 'flex',
        gap: '15px',
        justifyContent: 'flex-end',
        marginTop: '20px'
    },
    cancelBtn: {
        padding: '12px 24px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px'
    },
    submitBtn: {
        padding: '12px 32px',
        background: '#1da1d2',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '700',
        transition: 'background 0.3s ease',
        cursor: 'pointer'
    },
    alertCard: {
        textAlign: 'center',
        padding: '40px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
    },
    alertIcon: { fontSize: '48px', marginBottom: '15px' },
    backBtn: {
        marginTop: '20px',
        padding: '10px 24px',
        backgroundColor: '#0ea5e9',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600'
    }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default EvaluationForm;