import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { DocumentTimeline } from './DocumentTimeline';
import { StructuredTable } from './StructuredTable';
import { InlineChart } from './InlineChart';
import { FlagsList } from './FlagsList';
import { ActionsList } from './ActionsList';
import { T } from '../../lib/tokens';

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function RichResponse({ rich }) {
  if (!rich) return null;

  const { narrative, document_timelines, tables, charts, flags, actions } = rich;

  return (
    <div>
      {/* 1. Document Timeline — always first */}
      {document_timelines?.length > 0 && (
        <motion.div custom={0} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <DocumentTimeline timelines={document_timelines} />
        </motion.div>
      )}

      {/* 2. Narrative */}
      {narrative && (
        <motion.div custom={1} variants={SECTION_VARIANTS} initial="hidden" animate="visible"
          style={{ marginBottom: 16 }}
        >
          <p style={{
            fontSize: 10, fontWeight: 800, color: T.AMBER,
            fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 6,
          }}>
            EXECUTIVE SUMMARY
          </p>
          <p style={{ fontSize: 14, color: T.TEXT1, lineHeight: 1.7, margin: 0 }}>
            {narrative}
          </p>
        </motion.div>
      )}

      {/* 3. Tables */}
      {tables?.filter((t) => t.headers?.length > 0).map((table, i) => (
        <motion.div key={i} custom={2 + i} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <StructuredTable {...table} />
        </motion.div>
      ))}

      {/* 4. Charts */}
      {charts?.filter((c) => c.labels?.length > 0).map((chart, i) => (
        <motion.div key={i} custom={3 + i} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <InlineChart {...chart} />
        </motion.div>
      ))}

      {/* 5. Flags */}
      {flags?.length > 0 && (
        <motion.div custom={4} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <FlagsList flags={flags} />
        </motion.div>
      )}

      {/* 6. Actions */}
      {actions?.length > 0 && (
        <motion.div custom={5} variants={SECTION_VARIANTS} initial="hidden" animate="visible">
          <ActionsList actions={actions} />
        </motion.div>
      )}
    </div>
  );
}
