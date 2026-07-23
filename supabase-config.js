window.SUPABASE_URL = "https://mptbcdrrtyfzblnnzhrs.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wdGJjZHJydHlmemJsbm56aHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODY2MTQsImV4cCI6MjEwMDM2MjYxNH0.FCBQEQXqr1S_HUD918yIjTEjZF4viNr70Ui1SvAZDF8";

if (typeof supabase !== 'undefined') {
    window.db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
