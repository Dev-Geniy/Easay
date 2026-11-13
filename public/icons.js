const icons={
 home:'<path d="m3.5 11 8.5-7 8.5 7"/><path d="M6.5 9.5V20h11V9.5"/>',
 catalog:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.7"/>',
 review:'<path d="M7 7H4V4"/><path d="M4.5 7a8 8 0 0 1 14-2"/><path d="M17 17h3v3"/><path d="M19.5 17a8 8 0 0 1-14 2"/>',
 practice:'<path d="M5 6.5h14a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H9l-5 2V8.5a2 2 0 0 1 1-2Z"/><path d="M8 11h8M8 15h5"/>',
 mentor:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/>',
 profile:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
 book:'<path d="M3.5 5.5h7a2 2 0 0 1 2 2v12h-8a2 2 0 0 0-2 2v-14a2 2 0 0 1 1-2ZM12.5 19.5h8v-12a2 2 0 0 0-2-2h-6"/>',
 award:'<circle cx="12" cy="8" r="4.8"/><path d="m9 12-2 8 5-2.5 5 2.5-2-8"/>',
 stack:'<path d="m12 4 8 4.2-8 4.3-8-4.3L12 4Zm-8 9 8 4 8-4M4 17l8 4 8-4"/>',
 calendar:'<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M8 3v4m8-4v4M4 10h16"/>',
 basics:'<path d="M5 6h14M5 12h14M5 18h9"/>',
 everyday:'<circle cx="12" cy="12" r="8.5"/><path d="M8 10h8M8 14h5"/>',
 work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
 business:'<path d="m5 17 5-5 3 3 6-7"/><path d="M16 8h3v3"/>',
 travel:'<path d="m2.5 11.5 19-7-5.5 7 5.5 7-19-7Z"/>',
 interview:'<rect x="4" y="4" width="16" height="14" rx="3"/><path d="M8 10h8M8 14h5M8 18v3l5-3"/>',
 tech:'<rect x="3" y="4" width="18" height="14" rx="3"/><path d="M9 21h6M12 18v3"/>',
 social:'<circle cx="8.5" cy="9" r="3"/><circle cx="16.5" cy="9" r="2.6"/><path d="M3.8 20c.3-3.5 2.1-5.5 5-5.5 2.8 0 4.5 2 4.8 5.5m0-4.5c.6-.5 1.7-1 3-1 2.6 0 3.9 2 4 5.5"/>',
 service:'<path d="M12 20c-5-3.2-8-6.4-8-10a4.4 4.4 0 0 1 8-2.5A4.4 4.4 0 0 1 20 10c0 3.6-3 6.8-8 10Z"/>',
 study:'<path d="m2 9.5 10-5 10 5-10 5-10-5Z"/><path d="M5 11.5v5c4 4 10 4 14 0v-5"/>',
 advanced:'<path d="M4 17.5 10 12l3 3 7-8"/><path d="M17 7h3v3"/>',
 volume:'<path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Zm4 4a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>'
};
export function glyph(name){
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.book)+'</svg>';
}
