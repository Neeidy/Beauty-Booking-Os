// Prevents real postgres connections during tests
const postgres = () => ({});
export default postgres;
