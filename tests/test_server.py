import unittest

from server import SearchResultParser, ai_completion_url, local_concept, validate_theme


class ForjaHelpersTests(unittest.TestCase):
    def test_validate_theme_strips_whitespace_and_rejects_empty_or_long_values(self):
        self.assertEqual(validate_theme("  oceanos  ", "tema"), "oceanos")
        with self.assertRaises(ValueError):
            validate_theme(" ", "tema")
        with self.assertRaises(ValueError):
            validate_theme("x" * 61, "tema")

    def test_search_parser_extracts_result_and_decodes_duckduckgo_redirect(self):
        parser = SearchResultParser()
        parser.feed(
            '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">'
            "Fonte &amp; ideia</a>"
            '<div class="result__snippet">Um trecho <b>público</b> de referência</div>'
        )
        parser.close()
        self.assertEqual(parser.results[0]["url"], "https://example.com/page")
        self.assertEqual(parser.results[0]["title"], "Fonte & ideia")
        self.assertEqual(parser.results[0]["snippet"], "Um trecho público de referência")

    def test_ai_endpoint_normalizes_base_url(self):
        self.assertEqual(ai_completion_url("https://ai.example/v1"), "https://ai.example/v1/chat/completions")
        self.assertEqual(
            ai_completion_url("https://ai.example/v1/chat/completions"),
            "https://ai.example/v1/chat/completions",
        )
        with self.assertRaises(ValueError):
            ai_completion_url("file:///tmp/api")
        with self.assertRaises(ValueError):
            ai_completion_url("https://ai.example/v1?token=secret")

    def test_local_concept_has_all_required_fields(self):
        concept = local_concept("oceano", "botânica")
        self.assertEqual(set(concept), {"title", "premise", "loop", "twist"})
        self.assertIn("oceano", concept["premise"])


if __name__ == "__main__":
    unittest.main()
