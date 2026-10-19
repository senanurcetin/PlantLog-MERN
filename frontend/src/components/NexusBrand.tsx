import nexusLogo from '../assets/nexus-logo.svg';
import nexusMark from '../assets/nexus-mark.svg';

/** Official NEXUS 2.0 logo, with PlantLog retained as the product name. */
const NexusBrand = ({ compact = false, light = true }: {
    compact?: boolean;
    light?: boolean;
}) => (
    <span className="inline-flex min-w-0 items-center gap-3">
        {compact ? (
            <img src={nexusMark} alt="NEXUS" className="h-10 w-10 shrink-0" />
        ) : (
            <img src={nexusLogo} alt="NEXUS" className="h-11 w-32 shrink-0 object-contain sm:w-36" />
        )}
        <span className={`min-w-0 border-l pl-3 leading-tight ${light
            ? 'border-white/20 text-white' : 'border-slate-300 text-slate-900'}`}>
            <span className="block truncate text-sm font-bold tracking-wide">PlantLog</span>
            <span className={`block text-[10px] uppercase tracking-widest ${light
                ? 'text-[#B9C5CE]' : 'text-slate-500'}`}>Industrial logbook</span>
        </span>
    </span>
);
export default NexusBrand;
