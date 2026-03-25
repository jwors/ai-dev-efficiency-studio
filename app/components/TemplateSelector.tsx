'use client';

import React, { useState, useMemo, useEffect } from 'react';
import styles from './TemplateSelector.module.css';
import {
  ARCHITECTURE_TEMPLATES,
  CATEGORY_LABELS,
  type ArchitectureTemplate,
  type TemplateCategory,
} from '@/lib/architecture/templates';

// 分类常量（移到组件外部避免每次渲染重新创建）
const CATEGORIES: Array<TemplateCategory | 'all'> = [
  'all',
  'web',
  'microservice',
  'serverless',
  'data',
  'mobile',
];

interface TemplateSelectorProps {
  onSelect: (template: ArchitectureTemplate) => void;
  onClose: () => void;
}

/**
 * 架构模板选择器组件
 *
 * 提供预设架构模板的选择界面，支持分类筛选和模板预览
 */
export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Escape 键关闭模态框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') {
      return ARCHITECTURE_TEMPLATES;
    }
    return ARCHITECTURE_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>选择架构模板</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="关闭模板选择器">
            ×
          </button>
        </div>

        <div className={styles.categoryTabs}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryTab} ${selectedCategory === cat ? styles.categoryTabActive : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className={styles.templateGrid}>
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`${styles.templateCard} ${hoveredTemplate === template.id ? styles.templateCardHovered : ''}`}
              onClick={() => onSelect(template)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              <div className={styles.templatePreview}>
                <div className={styles.previewIcon}>
                  {getCategoryIcon(template.category)}
                </div>
                <div className={styles.previewBadge}>
                  {CATEGORY_LABELS[template.category]}
                </div>
              </div>
              <div className={styles.templateInfo}>
                <h3 className={styles.templateName}>{template.name}</h3>
                <p className={styles.templateDesc}>{template.description}</p>
                <div className={styles.templateTags}>
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className={styles.templateStats}>
                  <span>{template.architecture.components.length} 组件</span>
                  <span>{template.architecture.connections.length} 连线</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerHint}>
            点击模板卡片以使用该架构作为起点
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 获取分类图标
 */
function getCategoryIcon(category: TemplateCategory): string {
  const icons: Record<TemplateCategory, string> = {
    web: '🌐',
    microservice: '🔗',
    serverless: '⚡',
    data: '📊',
    mobile: '📱',
  };
  return icons[category] || '📦';
}