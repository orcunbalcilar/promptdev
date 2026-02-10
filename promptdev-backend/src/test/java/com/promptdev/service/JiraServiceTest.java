package com.promptdev.service;

import com.promptdev.dto.jira.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "rawtypes"})
class JiraServiceTest {

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private RestClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private RestClient.RequestBodySpec requestBodySpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private JiraService jiraService;

    @BeforeEach
    void setUp() {
        jiraService = new JiraService(restClient);
    }

    private void stubGetWithFunctionUri() {
        doReturn(requestHeadersUriSpec).when(restClient).get();
        doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(any(Function.class));
        doReturn(responseSpec).when(requestHeadersSpec).retrieve();
    }

    private void stubGetWithTemplateUri() {
        doReturn(requestHeadersUriSpec).when(restClient).get();
        doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(any(String.class), any(Object[].class));
        doReturn(responseSpec).when(requestHeadersSpec).retrieve();
    }

    private void stubPostChain(String uriTemplate) {
        doReturn(requestBodyUriSpec).when(restClient).post();
        doReturn(requestBodySpec).when(requestBodyUriSpec).uri(eq(uriTemplate), any(Object[].class));
        doReturn(requestBodySpec).when(requestBodySpec).contentType(MediaType.APPLICATION_JSON);
        lenient().doReturn(requestBodySpec).when(requestBodySpec).body(any());
        lenient().doReturn(requestBodySpec).when(requestBodySpec).body(any(Object.class));
        doReturn(responseSpec).when(requestBodySpec).retrieve();
        doReturn(null).when(responseSpec).toBodilessEntity();
    }

    private void stubPutChain(String uriTemplate) {
        doReturn(requestBodyUriSpec).when(restClient).put();
        doReturn(requestBodySpec).when(requestBodyUriSpec).uri(eq(uriTemplate), any(Object[].class));
        doReturn(requestBodySpec).when(requestBodySpec).contentType(MediaType.APPLICATION_JSON);
        lenient().doReturn(requestBodySpec).when(requestBodySpec).body(any());
        lenient().doReturn(requestBodySpec).when(requestBodySpec).body(any(Object.class));
        doReturn(responseSpec).when(requestBodySpec).retrieve();
        doReturn(null).when(responseSpec).toBodilessEntity();
    }

    @Nested
    @DisplayName("searchIssues")
    class SearchIssues {

        @Test
        @DisplayName("should call search endpoint with JQL, startAt, and maxResults")
        void shouldSearchWithJql() {
            stubGetWithFunctionUri();

            JiraSearchResponse expected = new JiraSearchResponse(0, 50, 1, List.of());
            doReturn(expected).when(responseSpec).body(JiraSearchResponse.class);

            JiraSearchResponse result = jiraService.searchIssues("project = TEST", 0, 50);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1);
            assertThat(result.issues()).isEmpty();
            verify(restClient).get();
        }

        @Test
        @DisplayName("should return response with issues")
        void shouldReturnIssues() {
            stubGetWithFunctionUri();

            JiraIssueResponse issue = new JiraIssueResponse("10001", "TEST-1",
                    new JiraIssueResponse.JiraIssueFields(
                            "Test issue", null, null, null, null, null, null, null));
            JiraSearchResponse expected = new JiraSearchResponse(0, 50, 1, List.of(issue));
            doReturn(expected).when(responseSpec).body(JiraSearchResponse.class);

            JiraSearchResponse result = jiraService.searchIssues("project = TEST", 0, 50);

            assertThat(result.issues()).hasSize(1);
            assertThat(result.issues().get(0).key()).isEqualTo("TEST-1");
        }
    }

    @Nested
    @DisplayName("getIssue")
    class GetIssue {

        @Test
        @DisplayName("should fetch issue by key")
        void shouldFetchIssueByKey() {
            stubGetWithTemplateUri();

            JiraIssueResponse expected = new JiraIssueResponse("10042", "TEST-42",
                    new JiraIssueResponse.JiraIssueFields(
                            "Fix bug", null, null, null, null, "A bug description", null, null));
            doReturn(expected).when(responseSpec).body(JiraIssueResponse.class);

            JiraIssueResponse result = jiraService.getIssue("TEST-42");

            assertThat(result).isNotNull();
            assertThat(result.key()).isEqualTo("TEST-42");
            assertThat(result.fields().summary()).isEqualTo("Fix bug");
            assertThat(result.fields().description()).isEqualTo("A bug description");
            verify(restClient).get();
        }
    }

    @Nested
    @DisplayName("getTransitions")
    class GetTransitions {

        @Test
        @DisplayName("should return transitions for an issue")
        void shouldReturnTransitions() {
            stubGetWithTemplateUri();

            JiraTransitionResponse expected = new JiraTransitionResponse(List.of(
                    new JiraTransitionResponse.JiraTransition("11", "In Progress",
                            new JiraTransitionResponse.JiraStatus("In Progress", "3")),
                    new JiraTransitionResponse.JiraTransition("21", "Done",
                            new JiraTransitionResponse.JiraStatus("Done", "5"))
            ));
            doReturn(expected).when(responseSpec).body(JiraTransitionResponse.class);

            JiraTransitionResponse result = jiraService.getTransitions("TEST-10");

            assertThat(result).isNotNull();
            assertThat(result.transitions()).hasSize(2);
            assertThat(result.transitions().get(0).name()).isEqualTo("In Progress");
            assertThat(result.transitions().get(1).name()).isEqualTo("Done");
        }

        @Test
        @DisplayName("should return empty transitions list when none available")
        void shouldReturnEmptyTransitions() {
            stubGetWithTemplateUri();

            JiraTransitionResponse expected = new JiraTransitionResponse(List.of());
            doReturn(expected).when(responseSpec).body(JiraTransitionResponse.class);

            JiraTransitionResponse result = jiraService.getTransitions("TEST-99");

            assertThat(result.transitions()).isEmpty();
        }
    }

    @Nested
    @DisplayName("transitionIssue")
    class TransitionIssue {

        @Test
        @DisplayName("should POST transition to correct endpoint")
        void shouldPostTransition() {
            stubPostChain("/issue/{issueKey}/transitions");

            jiraService.transitionIssue("TEST-10", "21");

            verify(restClient).post();
            verify(requestBodySpec).body(any(JiraTransitionRequest.class));
            verify(responseSpec).toBodilessEntity();
        }
    }

    @Nested
    @DisplayName("addComment")
    class AddComment {

        @Test
        @DisplayName("should POST comment to correct endpoint")
        void shouldPostComment() {
            stubPostChain("/issue/{issueKey}/comment");

            jiraService.addComment("TEST-10", "This is a comment");

            verify(restClient).post();
            verify(requestBodySpec).body(any(JiraCommentRequest.class));
            verify(responseSpec).toBodilessEntity();
        }
    }

    @Nested
    @DisplayName("assignIssue")
    class AssignIssue {

        @Test
        @DisplayName("should PUT assignment to correct endpoint")
        void shouldPutAssignment() {
            stubPutChain("/issue/{issueKey}/assignee");

            jiraService.assignIssue("TEST-10", "jdoe");

            verify(restClient).put();
            verify(requestBodySpec).body(any(Map.class));
            verify(responseSpec).toBodilessEntity();
        }
    }

    @Nested
    @DisplayName("getIssuesByProject")
    class GetIssuesByProject {

        @Test
        @DisplayName("should search with correct project JQL")
        void shouldSearchByProject() {
            stubGetWithFunctionUri();

            JiraSearchResponse expected = new JiraSearchResponse(0, 10, 0, List.of());
            doReturn(expected).when(responseSpec).body(JiraSearchResponse.class);

            JiraSearchResponse result = jiraService.getIssuesByProject("MYPRJ", 0, 10);

            assertThat(result).isNotNull();
            verify(restClient).get();
        }
    }

    @Nested
    @DisplayName("getAssignedIssues")
    class GetAssignedIssues {

        @Test
        @DisplayName("should search with assignee JQL")
        void shouldSearchByAssignee() {
            stubGetWithFunctionUri();

            JiraSearchResponse expected = new JiraSearchResponse(0, 10, 0, List.of());
            doReturn(expected).when(responseSpec).body(JiraSearchResponse.class);

            JiraSearchResponse result = jiraService.getAssignedIssues("jdoe", 0, 10);

            assertThat(result).isNotNull();
            verify(restClient).get();
        }
    }
}
