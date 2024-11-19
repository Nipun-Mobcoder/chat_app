function formatDate(inputDate: Date): string {
    const now = new Date();
    
    const startOfWeek = (date: Date): Date => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };
  
    const currentYear = now.getFullYear();
    const inputYear = inputDate.getFullYear();
  
    const startOfCurrentWeek = startOfWeek(now);
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
    
    if (inputDate >= startOfCurrentWeek && inputDate <= endOfCurrentWeek) {
      return inputDate.toLocaleDateString('en-US', { weekday: 'long' });
    } else if (inputYear === currentYear) {
      return inputDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    
    return inputDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default formatDate;