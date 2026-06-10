const LoadingSkeleton = () => (
    <div style={styles.skeleton}>
        <div style={styles.skeletonHeader}></div>
        <div style={styles.skeletonRow}></div>
        <div style={styles.skeletonRow}></div>
        <div style={styles.skeletonRow}></div>
    </div>
);

const styles = {
    skeleton: { animation: 'pulse 1.5s ease-in-out infinite' },
    skeletonHeader: { height: '40px', backgroundColor: '#e2e8f0', borderRadius: '8px', marginBottom: '16px' },
    skeletonRow: { height: '20px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }
};