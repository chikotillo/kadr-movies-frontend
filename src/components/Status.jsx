export const Loader = () => <div className="spinner" aria-label="Загрузка" />

export const ErrorBox = ({ message }) => <p className="error">⚠ {message}</p>

export const SkeletonGrid = ({ n = 12 }) => (
  <div className="grid">
    {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" />)}
  </div>
)