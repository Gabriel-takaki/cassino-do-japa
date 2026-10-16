# Cassino do Japa

Portal responsivo para uma noite temática de cassino. Inclui check-in persistente com Supabase, regras de jogos, dinâmica das fichas, cardápio, ranking local e QR Codes para impressão.

## Rodar localmente

Abra `index.html` no navegador ou sirva a pasta com qualquer servidor HTTP estático.

## Publicação

O site é compatível com GitHub Pages e não exige processo de build.

## Banco de dados do check-in

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Preencha `assets/config.js` com a Project URL e a chave pública `anon`.

A tabela aceita check-ins públicos, mas não permite leitura pública dos nomes. O site consulta somente a função agregada `checkin_count`, que retorna a quantidade total de presentes.
